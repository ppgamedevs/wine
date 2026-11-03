/**
 * Deterministic request signals for the AI Sommelier.
 *
 * Everything in this file is rule-based and unit-testable. Jev may add
 * interpretation on top, but it can never override these results:
 * - explicit food references,
 * - explicit exclusions,
 * - colour contradictions,
 * - hard constraint filtering of candidates.
 */
import {
  FOOD_CATEGORIES,
  categorizeFoodText,
  normalizeFoodToken,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import { priceSatisfiesBudget, type BudgetExtraction } from "@/lib/sommelier-budget";
import type { ColorPreference, SweetnessPreference } from "@/lib/sommelier-occasions";

export function normalizeSommelierText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface DishReference {
  /** Canonical dish text accepted by `scoreWineForDish`. */
  dish: string;
  category: FoodCategoryId;
  matchedText: string;
}

/**
 * Synonym matches that are common Romanian words in another sense.
 * `peste` = "over" (e.g. "peste 80 de lei") as well as "fish".
 */
const AMBIGUOUS_SYNONYM_GUARD: Record<string, (window: string) => boolean> = {
  peste: (window) => !/\d/.test(window),
};

function boundedIndexes(haystack: string, needle: string): number[] {
  const indexes: number[] = [];
  let from = 0;
  while (from <= haystack.length) {
    const index = haystack.indexOf(needle, from);
    if (index < 0) break;
    const before = index === 0 || haystack[index - 1] === " ";
    const end = index + needle.length;
    const after = end === haystack.length || haystack[end] === " ";
    if (before && after) indexes.push(index);
    from = index + 1;
  }
  return indexes;
}

/**
 * Find the most specific dish the user actually mentions.
 * Longer synonyms win, so "peste la gratar" is not also "peste".
 */
export function extractDishReference(raw: string): DishReference | null {
  const text = normalizeFoodToken(raw);
  if (!text) return null;

  let best: { length: number; dish: string; category: FoodCategoryId; matched: string } | null =
    null;

  for (const category of FOOD_CATEGORIES) {
    for (const synonym of category.synonyms) {
      const token = normalizeFoodToken(synonym);
      if (!token) continue;
      const guard = AMBIGUOUS_SYNONYM_GUARD[token];
      for (const index of boundedIndexes(text, token)) {
        if (guard && !guard(text.slice(Math.max(0, index - 8), index + token.length + 16))) {
          continue;
        }
        if (!best || token.length > best.length) {
          best = {
            length: token.length,
            dish: synonym,
            category: category.id,
            matched: token,
          };
        }
      }
    }
  }

  if (!best) return null;
  return {
    dish: best.dish,
    category: best.category,
    matchedText: best.matched,
  };
}

export interface ExclusionSignals {
  /** Colours the user explicitly rejected. */
  colors: ColorPreference[];
  /** Sweetness levels the user explicitly rejected. */
  sweetness: SweetnessPreference[];
  /** Requested acidity, including through exclusions ("not too acidic"). */
  acidity: "low" | "medium" | "high" | null;
  /** Requested body. */
  body: "light" | "medium" | "full" | null;
  /** Style words the user wants to avoid (tannic, oaky...). */
  avoidStyles: string[];
  detected: boolean;
}

const EMPTY_EXCLUSIONS: ExclusionSignals = {
  colors: [],
  sweetness: [],
  acidity: null,
  body: null,
  avoidStyles: [],
  detected: false,
};

const COLOR_WORDS: Record<string, ColorPreference> = {
  rosu: "red",
  rosii: "red",
  rosie: "red",
  red: "red",
  alb: "white",
  albe: "white",
  alba: "white",
  white: "white",
  rose: "rose",
  roze: "rose",
  roz: "rose",
  spumant: "sparkling",
  sparkling: "sparkling",
};

const SWEETNESS_WORDS: Record<string, SweetnessPreference> = {
  dulce: "dulce",
  dulci: "dulce",
  sweet: "dulce",
  demidulce: "demidulce",
  demisec: "demisec",
  sec: "sec",
  dry: "sec",
};

/**
 * Extract explicit exclusions and style preferences the deterministic layer can
 * honour. Absence of a signal is `null`, never an assumed default.
 */
export function extractExclusionSignals(raw: string): ExclusionSignals {
  const text = normalizeSommelierText(raw);
  if (!text) return { ...EMPTY_EXCLUSIONS };

  const colors = new Set<ColorPreference>();
  const sweetness = new Set<SweetnessPreference>();
  const avoidStyles: string[] = [];
  let acidity: ExclusionSignals["acidity"] = null;
  let body: ExclusionSignals["body"] = null;

  const colorPattern =
    /\b(?:nu|fara|not|no)\s+(?:(?:vreau|as vrea|prefer)\s+)?(?:un\s+|o\s+)?(rosu|rosii|rosie|red|alb|albe|alba|white|rose|roze|roz|spumant|sparkling)\b/g;
  for (const match of text.matchAll(colorPattern)) {
    const word = match[1];
    const color = COLOR_WORDS[word];
    if (color) colors.add(color);
  }

  const sweetnessPattern =
    /\b(?:nu|fara|not|no)\s+(?:(?:vreau|as vrea|prefer)\s+)?(?:prea\s+|foarte\s+|too\s+)?(dulce|dulci|sweet|demidulce|demisec|sec|dry)\b/g;
  for (const match of text.matchAll(sweetnessPattern)) {
    const word = match[1];
    const level = SWEETNESS_WORDS[word];
    if (level) sweetness.add(level);
  }

  const negativeAcidity =
    /\b(?:nu|fara)\b[^.!?]{0,24}\b(?:acid|aciditate|acidic)\b/.test(text) ||
    /\b(?:low acidity|not (?:too )?acidic|not (?:too )?acid|less acidic)\b/.test(text);
  if (negativeAcidity) {
    acidity = "low";
  } else if (/\b(?:acid|aciditate|acidic|fresh|crisp)\b/.test(text)) {
    acidity = "high";
  }

  if (/\b(?:nu prea|not too|fara)\s+(?:corpolent|greu|puternic|full)\b/.test(text)) {
    body = "light";
  } else if (/\b(?:corpolent|puternic|robust|full[- ]bodied)\b/.test(text)) {
    body = "full";
  }

  if (/\b(?:fara|nu vreau|not)\s+(?:tanin|taninuri|tannin|tannins)\b/.test(text)) {
    avoidStyles.push("tannic");
  }
  if (/\b(?:fara|nu vreau|not)\s+(?:stejar|barrique|oak)\b/.test(text)) {
    avoidStyles.push("oaky");
  }

  const detected =
    colors.size > 0 ||
    sweetness.size > 0 ||
    avoidStyles.length > 0 ||
    acidity != null ||
    body != null;

  return {
    colors: [...colors],
    sweetness: [...sweetness],
    acidity,
    body,
    avoidStyles,
    detected,
  };
}

/** Detect a contradictory colour request ("vreau rosu, dar si alb"). */
export function detectColorContradiction(raw: string): boolean {
  const text = normalizeSommelierText(raw);
  // Negated colours are exclusions handled elsewhere, not preferences.
  const withoutNegated = text.replace(
    /\b(?:nu|fara|not|no)\s+(?:vreau\s+|prefer\s+)?(?:un\s+|o\s+)?(?:rosu|rosii|rosie|red|alb|albe|alba|white|rose|roze|roz|spumant|sparkling)\b/g,
    " ",
  );
  const hasRed = /\b(rosu|rosii|rosie|red)\b/.test(withoutNegated);
  const hasWhite = /\b(alb|albe|alba|white)\b/.test(withoutNegated);
  if (!hasRed || !hasWhite) return false;
  // "alb-negru" / "albastru" are not colour requests.
  if (/\balb[- ]?(negru|astru)\b/.test(withoutNegated)) return false;
  return /\b(?:dar|insa|but|however|sau|or)\b/.test(withoutNegated);
}

export interface HardConstraintWine {
  slug: string;
  type: string;
  sweetness: string | null;
  priceAvg: number | null;
  currentPrice?: number | null;
}

export interface HardConstraintInput {
  budget: BudgetExtraction;
  color: ColorPreference;
  sweetness: SweetnessPreference;
  exclusions?: ExclusionSignals;
}

function winePrice(wine: HardConstraintWine): number | null {
  return wine.currentPrice ?? wine.priceAvg;
}

/**
 * Enforce explicit user constraints on a candidate list.
 *
 * This is intentionally narrower than the ranking engine: it only removes wines
 * that provably violate the request. It never re-scores, so canonical Value
 * Score and persisted rankings are untouched.
 */
export function filterCandidatesByHardConstraints<
  T extends HardConstraintWine,
>(wines: T[], input: HardConstraintInput): T[] {
  const excludedColors = new Set(input.exclusions?.colors ?? []);
  const excludedSweetness = new Set(input.exclusions?.sweetness ?? []);

  return wines.filter((wine) => {
    if (!priceSatisfiesBudget(winePrice(wine), input.budget)) return false;

    if (input.color !== "any" && wine.type !== input.color) return false;

    if (input.sweetness !== "any" && wine.sweetness !== input.sweetness) {
      return false;
    }

    if (excludedColors.has(wine.type as ColorPreference)) return false;
    if (
      wine.sweetness &&
      excludedSweetness.has(wine.sweetness as SweetnessPreference)
    ) {
      return false;
    }

    return true;
  });
}

export function summarizeFoodCategories(raw: string): FoodCategoryId[] {
  return categorizeFoodText(raw);
}
