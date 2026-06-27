import type { WineType, WineSweetness, WineWithRelations } from "@/types";

export type ColorPreference = "any" | "red" | "white" | "rose" | "sparkling";
export type SweetnessPreference = "any" | WineSweetness;

export interface SommelierInput {
  budgetMin: number;
  budgetMax: number;
  occasion: OccasionId;
  color: ColorPreference;
  sweetness: SweetnessPreference;
  preferredWinerySlugs: string[];
}

export type OccasionId =
  | "oricare"
  | "nunta"
  | "cadou"
  | "cadou-business"
  | "cina-romantica"
  | "sarmale"
  | "gratar"
  | "petrecere"
  | "sarbatori";

interface OccasionConfig {
  id: OccasionId;
  label: string;
  description: string;
  /** Weight applied to each score dimension (0-1). */
  weights: {
    value: number;
    gift: number;
    food: number;
  };
  /** Wine types that fit this occasion particularly well. */
  preferredTypes: WineType[];
  /** Dish keywords that boost a wine when present in its pairings. */
  dishKeywords: string[];
  /** Short rationale fragment used in explanations. */
  rationale: string;
}

export const OCCASIONS: OccasionConfig[] = [
  {
    id: "oricare",
    label: "Oricare ocazie",
    description: "Recomandari echilibrate, raport calitate-pret",
    weights: { value: 0.7, gift: 0.15, food: 0.15 },
    preferredTypes: [],
    dishKeywords: [],
    rationale: "echilibru bun intre calitate si pret",
  },
  {
    id: "nunta",
    label: "Nunta",
    description: "Impresie buna, potrivit pentru multi invitati",
    weights: { value: 0.4, gift: 0.45, food: 0.15 },
    preferredTypes: ["sparkling", "white", "rose"],
    dishKeywords: [],
    rationale: "face impresie la evenimente mari",
  },
  {
    id: "cadou",
    label: "Cadou",
    description: "Vin care arata si se simte premium",
    weights: { value: 0.3, gift: 0.6, food: 0.1 },
    preferredTypes: [],
    dishKeywords: [],
    rationale: "se prezinta excelent ca dar",
  },
  {
    id: "cadou-business",
    label: "Cadou business",
    description: "Prestigiu si siguranta pentru parteneri",
    weights: { value: 0.25, gift: 0.65, food: 0.1 },
    preferredTypes: ["red"],
    dishKeywords: [],
    rationale: "transmite prestigiu intr-un context profesional",
  },
  {
    id: "cina-romantica",
    label: "Cina romantica",
    description: "Elegant, rafinat, pentru doua persoane",
    weights: { value: 0.4, gift: 0.3, food: 0.3 },
    preferredTypes: ["red", "white"],
    dishKeywords: ["peste", "paste", "branza", "somon"],
    rationale: "creeaza o atmosfera rafinata la cina in doi",
  },
  {
    id: "sarmale",
    label: "Sarmale",
    description: "Pentru masa traditionala romaneasca",
    weights: { value: 0.4, gift: 0.05, food: 0.55 },
    preferredTypes: ["red"],
    dishKeywords: ["sarmale", "mamaliga", "varza"],
    rationale: "se asociaza perfect cu sarmale",
  },
  {
    id: "gratar",
    label: "Gratar / mititei",
    description: "Pentru carne la gratar si mici",
    weights: { value: 0.45, gift: 0.05, food: 0.5 },
    preferredTypes: ["red", "rose"],
    dishKeywords: ["gratar", "mici", "mititei", "burger", "porc", "vita"],
    rationale: "merge excelent cu gratarul si micii",
  },
  {
    id: "petrecere",
    label: "Petrecere",
    description: "Usor de baut, placut pentru toata lumea",
    weights: { value: 0.6, gift: 0.1, food: 0.3 },
    preferredTypes: ["rose", "white", "sparkling"],
    dishKeywords: ["pizza", "paste"],
    rationale: "este accesibil si placut pentru un grup",
  },
  {
    id: "sarbatori",
    label: "Sarbatori (Craciun, Paste)",
    description: "Pentru mesele festive de sarbatori",
    weights: { value: 0.4, gift: 0.25, food: 0.35 },
    preferredTypes: ["red", "dessert"],
    dishKeywords: ["cozonac", "friptura", "rata", "curcan", "desert"],
    rationale: "completeaza mesele festive de sarbatori",
  },
];

export function getOccasion(id: OccasionId): OccasionConfig {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0];
}

export interface Recommendation {
  wine: WineWithRelations;
  matchScore: number;
  reasons: string[];
  budgetFit: "under" | "ideal" | "over";
}

interface ScoredWine {
  wine: WineWithRelations;
  raw: number;
  reasons: string[];
  budgetFit: Recommendation["budgetFit"];
}

/**
 * Best achievable raw score for a given request, used to normalize the
 * displayed match percentage so results spread meaningfully.
 */
function maxAchievableScore(input: SommelierInput): number {
  const occasion = getOccasion(input.occasion);
  let max = 100; // weighted dimensions all at 100
  max += 8; // ideal budget fit
  if (input.color !== "any") max += 14;
  if (input.sweetness !== "any") max += 10;
  if (occasion.preferredTypes.length > 0) max += 10;
  if (occasion.dishKeywords.length > 0) max += 12;
  if (input.preferredWinerySlugs.length > 0) max += 18;
  return max;
}

const COLOR_TO_TYPES: Record<ColorPreference, WineType[]> = {
  any: [],
  red: ["red"],
  white: ["white"],
  rose: ["rose"],
  sparkling: ["sparkling"],
};

function normalize(value: number | null | undefined): number {
  if (value === null || value === undefined) return 50;
  return Math.max(0, Math.min(100, value));
}

function scoreWineRaw(
  wine: WineWithRelations,
  input: SommelierInput,
): ScoredWine | null {
  const occasion = getOccasion(input.occasion);
  const reasons: string[] = [];

  const value = normalize(wine.valueScore);
  const gift = normalize(wine.giftScore);
  const food = normalize(wine.foodMatchScore);

  let score =
    value * occasion.weights.value +
    gift * occasion.weights.gift +
    food * occasion.weights.food;

  const price = wine.priceAvg ?? null;
  let budgetFit: Recommendation["budgetFit"] = "ideal";

  if (price !== null) {
    if (price > input.budgetMax) {
      const overBy = (price - input.budgetMax) / input.budgetMax;
      if (overBy > 0.25) return null;
      score -= overBy * 120;
      budgetFit = "over";
    } else if (price < input.budgetMin) {
      score += 4;
      budgetFit = "under";
      reasons.push(
        `Sub bugetul tau, la doar ${Math.round(price)} RON, deci pui mai putin si primesti valoare buna.`,
      );
    } else {
      score += 8;
      budgetFit = "ideal";
      reasons.push(`Se incadreaza perfect in bugetul tau (${Math.round(price)} RON).`);
    }
  }

  const colorTypes = COLOR_TO_TYPES[input.color];
  if (colorTypes.length > 0) {
    if (colorTypes.includes(wine.type)) {
      score += 14;
    } else {
      score -= 28;
    }
  }

  if (input.sweetness !== "any") {
    if (wine.sweetness === input.sweetness) {
      score += 10;
      reasons.push(`Este ${input.sweetness}, exact tipul preferat de tine.`);
    } else if (wine.sweetness) {
      score -= 14;
    }
  }

  if (occasion.preferredTypes.includes(wine.type)) {
    score += 10;
    reasons.push(
      `Tip ${wine.type === "red" ? "rosu" : wine.type === "white" ? "alb" : wine.type}, potrivit pentru ${occasion.label.toLowerCase()}.`,
    );
  }

  if (occasion.dishKeywords.length > 0) {
    const pairingText = wine.foodPairings
      .map((p) => `${p.dish} ${p.note ?? ""}`)
      .join(" ")
      .toLowerCase();
    const matchedKeyword = occasion.dishKeywords.find((keyword) =>
      pairingText.includes(keyword),
    );
    if (matchedKeyword) {
      score += 12;
      const matchedDish = wine.foodPairings.find((p) =>
        `${p.dish} ${p.note ?? ""}`.toLowerCase().includes(matchedKeyword),
      );
      reasons.push(
        `Recomandat special pentru ${matchedDish?.dish ?? matchedKeyword}.`,
      );
    }
  }

  if (
    wine.winery?.slug &&
    input.preferredWinerySlugs.includes(wine.winery.slug)
  ) {
    score += 18;
    reasons.push(`Din ${wine.winery.name}, una dintre cramele tale preferate.`);
  }

  if (wine.valueScore && wine.valueScore >= 88) {
    reasons.push(
      `Value Score ${wine.valueScore}/100, printre cele mai bune la raport calitate-pret.`,
    );
  } else if (occasion.weights.gift >= 0.5 && wine.giftScore && wine.giftScore >= 82) {
    reasons.push(`Gift Score ${wine.giftScore}/100, ${occasion.rationale}.`);
  } else {
    reasons.push(
      `${capitalize(occasion.rationale)} (Value ${wine.valueScore ?? "N/A"}/100).`,
    );
  }

  if (wine.winery?.verified) {
    reasons.push("Crama este verificata in baza noastra de date.");
  }

  return {
    wine,
    raw: score,
    reasons: reasons.slice(0, 4),
    budgetFit,
  };
}

export function recommendWines(
  allWines: WineWithRelations[],
  input: SommelierInput,
  limit = 5,
): Recommendation[] {
  const max = maxAchievableScore(input);

  const scored = allWines
    .map((wine) => scoreWineRaw(wine, input))
    .filter((rec): rec is ScoredWine => rec !== null)
    .sort((a, b) => b.raw - a.raw);

  return scored.slice(0, limit).map((rec) => ({
    wine: rec.wine,
    reasons: rec.reasons,
    budgetFit: rec.budgetFit,
    matchScore: Math.round(
      Math.max(40, Math.min(99, (rec.raw / max) * 100)),
    ),
  }));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
