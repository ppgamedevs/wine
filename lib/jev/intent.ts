/**
 * Map validated System One answers into VinIntel's structured intent.
 *
 * Design rules:
 * - `unknown` stays `unknown`. A low-confidence choice is discarded, not rounded
 *   to "medium", because a guessed preference becomes a fabricated claim in the
 *   final answer.
 * - Jev never overrides an explicit deterministic constraint. It only fills gaps
 *   the deterministic parser left open.
 * - Budget, price and availability are not part of this module.
 */
import {
  JEV_BODY,
  JEV_FOOD_CATEGORIES,
  JEV_FOOD_STRENGTHS,
  JEV_INTENSITIES,
  JEV_INTENT_FIELDS,
  JEV_OCCASIONS,
  JEV_STYLES,
  JEV_SWEETNESS,
  JEV_USER_INTENTS,
  JEV_WINE_COLORS,
  type JevBody,
  type JevFoodCategory,
  type JevFoodStrength,
  type JevIntent,
  type JevIntentConfidence,
  type JevIntentField,
  type JevIntensity,
  type JevOccasion,
  type JevStyle,
  type JevSweetness,
  type JevUserIntent,
  type JevWineColor,
} from "@/lib/jev/types";
import type { ParsedJevAnswers, JevAnswerValue } from "@/lib/jev/questions";
import type {
  ColorPreference,
  OccasionId,
  SommelierInput,
  SweetnessPreference,
} from "@/lib/sommelier-occasions";
import type { AppLocale } from "@/i18n/locale";

/**
 * Margin around 0.5 for noul answers. Tied to `JEV_MIN_CONFIDENCE` so one knob
 * controls how conservative the integration is.
 */
export function noulMargin(minConfidence: number): number {
  return Math.min(0.25, Math.max(0.05, minConfidence - 0.4));
}

function triState(
  answer: JevAnswerValue | undefined,
  minConfidence: number,
): boolean | null {
  if (!answer || answer.value == null) return null;
  const margin = noulMargin(minConfidence);
  if (answer.value >= 0.5 + margin) return true;
  if (answer.value <= 0.5 - margin) return false;
  return null;
}

interface GatedChoice<T extends string> {
  value: T | "unknown";
  confident: boolean;
  confidence: number;
}

function gatedChoice<T extends string>(
  answer: JevAnswerValue | undefined,
  allowed: readonly T[],
  minConfidence: number,
): GatedChoice<T> {
  if (!answer || !answer.choice) {
    return { value: "unknown", confident: false, confidence: 0 };
  }
  const confidence = answer.confidence ?? 0;
  if (!(allowed as readonly string[]).includes(answer.choice)) {
    return { value: "unknown", confident: false, confidence };
  }
  if (confidence < minConfidence) {
    return { value: "unknown", confident: false, confidence };
  }
  return { value: answer.choice as T, confident: true, confidence };
}

function scoreLevel<T extends string>(
  answer: JevAnswerValue | undefined,
  levels: readonly T[],
  minConfidence: number,
): GatedChoice<T> {
  if (!answer || answer.value == null) {
    return { value: "unknown", confident: false, confidence: 0 };
  }
  const confidence = answer.confidence ?? 0;
  if (confidence < minConfidence) {
    return { value: "unknown", confident: false, confidence };
  }
  const index = Math.min(levels.length - 1, Math.max(0, Math.round(answer.value)));
  return { value: levels[index] as T, confident: true, confidence };
}

/**
 * Build the intent object. Fields answered below the confidence threshold are
 * downgraded to `unknown`; the raw probability remains in `confidence`.
 */
export function buildJevIntent(
  parsed: ParsedJevAnswers,
  minConfidence: number,
): JevIntent {
  const answers = parsed.answers;

  const occasion = gatedChoice<JevOccasion>(
    answers.get("occasion"),
    JEV_OCCASIONS,
    minConfidence,
  );
  const foodCategory = gatedChoice<JevFoodCategory>(
    answers.get("food_category"),
    JEV_FOOD_CATEGORIES,
    minConfidence,
  );
  const color = gatedChoice<JevWineColor>(
    answers.get("wine_color"),
    JEV_WINE_COLORS,
    minConfidence,
  );
  const sweetness = gatedChoice<JevSweetness>(
    answers.get("sweetness"),
    JEV_SWEETNESS,
    minConfidence,
  );
  const acidity = gatedChoice<JevIntensity>(
    answers.get("acidity"),
    JEV_INTENSITIES,
    minConfidence,
  );
  const body = gatedChoice<JevBody>(answers.get("body"), JEV_BODY, minConfidence);
  const style = gatedChoice<JevStyle>(answers.get("style"), JEV_STYLES, minConfidence);
  const userIntent = gatedChoice<JevUserIntent>(
    answers.get("user_intent"),
    JEV_USER_INTENTS,
    minConfidence,
  );
  const strength = scoreLevel<JevFoodStrength>(
    answers.get("food_pairing_strength"),
    JEV_FOOD_STRENGTHS,
    minConfidence,
  );

  const foodPairing = triState(answers.get("food_pairing"), minConfidence);
  const specificProductRequest = triState(
    answers.get("specific_product_request"),
    minConfidence,
  );
  const hasExclusions = triState(answers.get("has_exclusions"), minConfidence);

  const confidence = Object.fromEntries(
    JEV_INTENT_FIELDS.map((field) => {
      switch (field) {
        case "occasion":
          return [field, occasion.confidence];
        case "foodPairing":
          return [field, answers.get("food_pairing")?.value ?? 0];
        case "foodPairingStrength":
          return [field, strength.confidence];
        case "foodCategory":
          return [field, foodCategory.confidence];
        case "color":
          return [field, color.confidence];
        case "sweetness":
          return [field, sweetness.confidence];
        case "acidity":
          return [field, acidity.confidence];
        case "body":
          return [field, body.confidence];
        case "style":
          return [field, style.confidence];
        case "userIntent":
          return [field, userIntent.confidence];
        case "specificProductRequest":
          return [field, answers.get("specific_product_request")?.value ?? 0];
        case "hasExclusions":
          return [field, answers.get("has_exclusions")?.value ?? 0];
        default:
          return [field, 0];
      }
    }),
  ) as JevIntentConfidence;

  const confidentFields: JevIntentField[] = [];
  const mark = (field: JevIntentField, confident: boolean) => {
    if (confident) confidentFields.push(field);
  };
  mark("occasion", occasion.confident && occasion.value !== "unknown");
  mark("foodPairing", foodPairing != null);
  mark(
    "foodPairingStrength",
    strength.confident && strength.value !== "unknown",
  );
  mark("foodCategory", foodCategory.confident && foodCategory.value !== "unknown");
  mark("color", color.confident && color.value !== "unknown");
  mark("sweetness", sweetness.confident && sweetness.value !== "unknown");
  mark("acidity", acidity.confident && acidity.value !== "unknown");
  mark("body", body.confident && body.value !== "unknown");
  mark("style", style.confident && style.value !== "unknown");
  mark("userIntent", userIntent.confident && userIntent.value !== "unknown");
  mark("specificProductRequest", specificProductRequest != null);
  mark("hasExclusions", hasExclusions != null);

  return {
    occasion: occasion.value as JevOccasion,
    foodPairing,
    foodPairingStrength: strength.value as JevFoodStrength,
    foodCategory: foodCategory.value as JevFoodCategory,
    color: color.value as JevWineColor,
    sweetness: sweetness.value as JevSweetness,
    acidity: acidity.value as JevIntensity,
    body: body.value as JevBody,
    style: style.value as JevStyle,
    userIntent: userIntent.value as JevUserIntent,
    specificProductRequest,
    hasExclusions,
    confidence,
    confidentFields,
  };
}

/** Fields Jev left unknown, used for ambiguity metrics (never logged with text). */
export function ambiguousJevFields(intent: JevIntent): JevIntentField[] {
  return JEV_INTENT_FIELDS.filter((field) => !intent.confidentFields.includes(field));
}

const SWEETNESS_MAP: Record<JevSweetness, SweetnessPreference> = {
  dry: "sec",
  off_dry: "demisec",
  semi_sweet: "demidulce",
  sweet: "dulce",
  unknown: "any",
};

const COLOR_MAP: Record<JevWineColor, ColorPreference> = {
  red: "red",
  white: "white",
  rose: "rose",
  sparkling: "sparkling",
  no_preference: "any",
  unknown: "any",
};

const OCCASION_MAP: Record<JevOccasion, OccasionId> = {
  everyday: "oricare",
  romantic_dinner: "cina-romantica",
  gift: "cadou",
  celebration: "petrecere",
  business: "cadou-business",
  unknown: "oricare",
};

/** Public mapping helpers so the evaluation harness compares like with like. */
export function toSommelierOccasion(occasion: JevOccasion): OccasionId {
  return OCCASION_MAP[occasion] ?? "oricare";
}

export function toSommelierColor(color: JevWineColor): ColorPreference {
  return COLOR_MAP[color] ?? "any";
}

export function toSommelierSweetness(
  sweetness: JevSweetness,
): SweetnessPreference {
  return SWEETNESS_MAP[sweetness] ?? "any";
}

const FOOD_DISH_MAP: Partial<Record<JevFoodCategory, string>> = {
  red_meat: "vita",
  white_meat: "pui",
  fish: "peste",
  seafood: "fructe de mare",
  pasta: "paste",
  cheese: "branza",
  dessert: "desert",
  traditional_romanian: "sarmale",
};

export interface IntentApplication {
  input: SommelierInput;
  applied: Array<"color" | "sweetness" | "occasion" | "dish">;
  ignored: string[];
}

/**
 * Fill only the gaps. An explicit deterministic value always wins, and a food
 * category is only converted to a dish when the deterministic parser found none.
 */
export function applyJevIntentToSommelierInput(
  input: SommelierInput,
  intent: JevIntent,
): IntentApplication {
  const next: SommelierInput = { ...input };
  const applied: IntentApplication["applied"] = [];
  const ignored: string[] = [];

  const mappedColor = COLOR_MAP[intent.color];
  const colorExcluded = input.exclusions?.colors.includes(mappedColor) ?? false;
  if (
    input.color === "any" &&
    mappedColor !== "any" &&
    !input.contradictoryColor &&
    !colorExcluded
  ) {
    next.color = mappedColor;
    applied.push("color");
  } else if (mappedColor !== "any") {
    ignored.push("color");
  }

  const mappedSweetness = SWEETNESS_MAP[intent.sweetness];
  const sweetnessExcluded =
    input.exclusions?.sweetness.includes(mappedSweetness) ?? false;
  if (
    input.sweetness === "any" &&
    mappedSweetness !== "any" &&
    !sweetnessExcluded
  ) {
    next.sweetness = mappedSweetness;
    applied.push("sweetness");
  } else if (mappedSweetness !== "any") {
    ignored.push("sweetness");
  }

  const occasion = OCCASION_MAP[intent.occasion];
  if (input.occasion === "oricare" && occasion !== "oricare") {
    next.occasion = occasion;
    applied.push("occasion");
  } else if (occasion !== "oricare") {
    ignored.push("occasion");
  }

  const dish = FOOD_DISH_MAP[intent.foodCategory];
  if (
    !input.dish &&
    dish &&
    intent.foodPairing !== false &&
    intent.foodPairingStrength !== "incidental"
  ) {
    next.dish = dish;
    applied.push("dish");
  } else if (dish && input.dish) {
    ignored.push("dish");
  }

  return { input: next, applied, ignored };
}

const OCCASION_LABEL_RO: Record<Exclude<JevOccasion, "unknown">, string> = {
  everyday: "o masa obisnuita",
  romantic_dinner: "o cina romantica",
  gift: "un cadou",
  celebration: "o sarbatoare",
  business: "un context de business",
};

const FOOD_LABEL_RO: Record<Exclude<JevFoodCategory, "unknown">, string> = {
  red_meat: "carne rosie",
  white_meat: "carne alba",
  fish: "peste",
  seafood: "fructe de mare",
  pasta: "paste",
  cheese: "branza",
  dessert: "desert",
  traditional_romanian: "mancare traditionala romaneasca",
  other: "alt fel de mancare",
};

const STYLE_LABEL_RO: Record<Exclude<JevStyle, "unknown">, string> = {
  fresh: "proaspat",
  fruity: "fructat",
  mineral: "mineral",
  creamy: "cremos",
  tannic: "tannic",
  complex: "complex",
  no_preference: "oricare",
};

const USER_INTENT_LABEL_RO: Record<Exclude<JevUserIntent, "unknown">, string> = {
  discover: "descoperire",
  compare: "comparatie",
  buy: "cumparare",
  gift: "cadou",
  learn: "informare",
};

/**
 * Compact, human-readable description of what Jev actually understood.
 * Only confident fields are rendered; unknown fields are omitted on purpose.
 */
export function describeJevIntent(
  intent: JevIntent,
  locale: AppLocale = "ro",
): string[] {
  const lines: string[] = [];
  const ro = locale !== "en";

  if (intent.occasion !== "unknown") {
    lines.push(
      ro
        ? `Ocazie: ${OCCASION_LABEL_RO[intent.occasion as Exclude<JevOccasion, "unknown">]}.`
        : `Occasion: ${intent.occasion}.`,
    );
  }
  if (intent.foodCategory !== "unknown") {
    lines.push(
      ro
        ? `Mancare: ${FOOD_LABEL_RO[intent.foodCategory as Exclude<JevFoodCategory, "unknown">]}.`
        : `Food: ${intent.foodCategory}.`,
    );
  }
  if (intent.color !== "unknown" && intent.color !== "no_preference") {
    lines.push(ro ? `Culoare ceruta: ${intent.color}.` : `Requested colour: ${intent.color}.`);
  }
  if (intent.sweetness !== "unknown") {
    lines.push(
      ro ? `Dulceata ceruta: ${intent.sweetness}.` : `Requested sweetness: ${intent.sweetness}.`,
    );
  }
  if (intent.acidity !== "unknown") {
    lines.push(ro ? `Aciditate ceruta: ${intent.acidity}.` : `Requested acidity: ${intent.acidity}.`);
  }
  if (intent.body !== "unknown") {
    lines.push(ro ? `Corp cerut: ${intent.body}.` : `Requested body: ${intent.body}.`);
  }
  if (intent.style !== "unknown" && intent.style !== "no_preference") {
    lines.push(
      ro
        ? `Stil cerut: ${STYLE_LABEL_RO[intent.style as Exclude<JevStyle, "unknown">]}.`
        : `Requested style: ${intent.style}.`,
    );
  }
  if (intent.userIntent !== "unknown") {
    lines.push(
      ro
        ? `Intentie: ${USER_INTENT_LABEL_RO[intent.userIntent as Exclude<JevUserIntent, "unknown">]}.`
        : `Intent: ${intent.userIntent}.`,
    );
  }
  if (intent.specificProductRequest === true) {
    lines.push(
      ro
        ? "Cererea numeste un vin, soi sau producator anume."
        : "The request names a specific wine, grape or producer.",
    );
  }
  if (intent.hasExclusions === true) {
    lines.push(ro ? "Exista excluderi explicite." : "The request contains explicit exclusions.");
  }

  return lines;
}

export interface IntentAgreement {
  agreement: "agree" | "disagree" | "not_compared";
  comparedFields: string[];
  disagreements: string[];
}

const DETERMINISTIC_SWEETNESS: Record<SweetnessPreference, JevSweetness> = {
  any: "unknown",
  sec: "dry",
  demisec: "off_dry",
  demidulce: "semi_sweet",
  dulce: "sweet",
};

const DETERMINISTIC_COLOR: Record<ColorPreference, JevWineColor> = {
  any: "unknown",
  red: "red",
  white: "white",
  rose: "rose",
  sparkling: "sparkling",
};

/**
 * Compare the deterministic interpretation with Jev's. Used in shadow mode to
 * measure whether Jev adds signal, without touching user-facing results.
 */
export function compareJevWithDeterministic(
  input: SommelierInput,
  intent: JevIntent,
): IntentAgreement {
  const comparedFields: string[] = [];
  const disagreements: string[] = [];

  if (intent.color !== "unknown" && DETERMINISTIC_COLOR[input.color] !== "unknown") {
    comparedFields.push("color");
    if (intent.color !== DETERMINISTIC_COLOR[input.color]) disagreements.push("color");
  }
  if (
    intent.sweetness !== "unknown" &&
    DETERMINISTIC_SWEETNESS[input.sweetness] !== "unknown"
  ) {
    comparedFields.push("sweetness");
    if (intent.sweetness !== DETERMINISTIC_SWEETNESS[input.sweetness]) {
      disagreements.push("sweetness");
    }
  }
  if (intent.occasion !== "unknown" && input.occasion !== "oricare") {
    comparedFields.push("occasion");
    if (OCCASION_MAP[intent.occasion] !== input.occasion) disagreements.push("occasion");
  }

  if (comparedFields.length === 0) {
    return { agreement: "not_compared", comparedFields, disagreements };
  }
  return {
    agreement: disagreements.length === 0 ? "agree" : "disagree",
    comparedFields,
    disagreements,
  };
}
