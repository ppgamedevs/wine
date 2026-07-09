import type { ExpertRecommendationOutput } from "@/lib/ai/schemas";
import {
  collectSommelierPairingText,
  countDessertKeywordMatches,
  isSweetnessDessertFriendly,
  ROMANIAN_DESSERT_KEYWORDS,
} from "@/lib/dessert-pairings";
import { formatWineMedalsForSommelier } from "@/lib/wine-medals";
import type { WineWithRelations } from "@/types";

export type ColorPreference = "any" | "red" | "white" | "rose" | "sparkling";
export type SweetnessPreference = "any" | "sec" | "demisec" | "demidulce" | "dulce";

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
  | "sarbatori"
  | "pentru-desert";

interface OccasionConfig {
  id: OccasionId;
  label: string;
  description: string;
  weights: { value: number; gift: number; food: number };
  preferredTypes: WineWithRelations["type"][];
  dishKeywords: string[];
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
    dishKeywords: ["gratar", "mici", "mititei", "burger", "porc", "vita", "tochitura"],
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
  {
    id: "pentru-desert",
    label: "Pentru desert",
    description: "Cozonac, pasca, prajituri si dulciuri romanesti",
    weights: { value: 0.35, gift: 0.2, food: 0.45 },
    preferredTypes: ["dessert", "white", "sparkling"],
    dishKeywords: [...ROMANIAN_DESSERT_KEYWORDS],
    rationale: "se potriveste cu deserturile romanesti traditionale",
  },
];

export function getOccasion(id: OccasionId): OccasionConfig {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0];
}

/** Legacy rule-based recommendation (fallback when RAG unavailable). */
export interface Recommendation {
  wine: WineWithRelations;
  matchScore: number;
  reasons: string[];
  budgetFit: "under" | "ideal" | "over";
}

/** Expert AI recommendation enriched with wine data for UI. */
export interface ExpertRecommendation extends ExpertRecommendationOutput {
  wine: WineWithRelations;
  budgetFit: "under" | "ideal" | "over";
}

interface ScoredWine {
  wine: WineWithRelations;
  raw: number;
  reasons: string[];
  budgetFit: Recommendation["budgetFit"];
}

function maxAchievableScore(input: SommelierInput): number {
  const occasion = getOccasion(input.occasion);
  let max = 100;
  max += 8;
  if (input.color !== "any") max += 14;
  if (input.sweetness !== "any") max += 10;
  if (occasion.preferredTypes.length > 0) max += 10;
  if (occasion.dishKeywords.length > 0) max += 12;
  if (input.occasion === "pentru-desert") max += 44;
  if (input.preferredWinerySlugs.length > 0) max += 18;
  return max;
}

const COLOR_TO_TYPES: Record<ColorPreference, WineWithRelations["type"][]> = {
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
    } else {
      score += 8;
      budgetFit = "ideal";
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
    } else if (wine.sweetness) {
      score -= 14;
    }
  }

  if (occasion.preferredTypes.includes(wine.type)) {
    score += 10;
  }

  const pairingText = collectSommelierPairingText(wine);

  if (occasion.dishKeywords.length > 0) {
    const matchedKeyword = occasion.dishKeywords.find((keyword) =>
      pairingText.includes(keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()),
    );
    if (matchedKeyword) {
      score += 12;
      reasons.push(`Potrivit pentru ${matchedKeyword}.`);
    }
  }

  if (input.occasion === "pentru-desert") {
    if (wine.dessertPairings.length > 0) {
      score += 14;
      reasons.push("Are pairing-uri editoriale cu deserturi romanesti.");
    }
    if (isSweetnessDessertFriendly(wine.sweetness)) {
      score += 10;
    }
    if (wine.type === "dessert") {
      score += 12;
    }
    const dessertMatches = countDessertKeywordMatches(pairingText);
    if (dessertMatches >= 2) {
      score += 8;
    }
  }

  if (
    wine.winery?.slug &&
    input.preferredWinerySlugs.includes(wine.winery.slug)
  ) {
    score += 18;
    reasons.push(`Din ${wine.winery.name}, crama preferata.`);
  }

  return { wine, raw: score, reasons, budgetFit };
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

/** Serialize wine + expert_notes for LLM context window. */
export function buildWineContextBlock(wine: WineWithRelations): string {
  const grapes = wine.grapeVarieties
    .map((g) => `${g.name}${g.percentage ? ` (${g.percentage}%)` : ""}`)
    .join(", ");
  const pairings = wine.foodPairings
    .map((p) => `${p.dish}${p.note ? `: ${p.note}` : ""}`)
    .join("; ");
  const dessertPairings = wine.dessertPairings
    .map((p) => `${p.dish}${p.note ? `: ${p.note}` : ""}`)
    .join("; ");
  const medalsSummary = formatWineMedalsForSommelier(wine.medals);

  const expert = wine.expertNotes
    ? `
EXPERT_NOTES:
- Istorie: ${wine.expertNotes.history}
- Terroir: ${wine.expertNotes.terroirSecrets}
- Vintage: ${wine.expertNotes.vintageQuirks}
- Pairing science: ${wine.expertNotes.pairingScience}
- Greseli comune: ${wine.expertNotes.commonMistakes}
- Aging: ${wine.expertNotes.agingPotential}
- Value insight: ${wine.expertNotes.valueInsight}
- Things you should know: ${wine.expertNotes.thingsYouShouldKnow.join(" | ")}`
    : "(expert_notes negenerate inca)";

  return `---
slug: ${wine.slug}
Nume: ${wine.name}${wine.vintage ? ` ${wine.vintage}` : ""}
Crama: ${wine.winery?.name ?? "N/A"} | Regiune: ${wine.region?.name ?? "N/A"}
Tip: ${wine.type} | Dulceata: ${wine.sweetness ?? "N/A"} | ${wine.priceAvg ?? "?"} RON
Soiuri: ${grapes}
Scoruri: Value ${wine.valueScore ?? "N/A"}, Gift ${wine.giftScore ?? "N/A"}, Food ${wine.foodMatchScore ?? "N/A"}
${medalsSummary ? `Medalii: ${medalsSummary}` : "Medalii: niciuna in baza de date"}
Note: ${wine.tastingNotes ?? "N/A"}
Pairing-uri mancare: ${pairings || "N/A"}
Pairing-uri desert: ${dessertPairings || "N/A"}
${expert}
---`;
}

export function buildWineContextForLLM(wines: WineWithRelations[]): string {
  return wines.map(buildWineContextBlock).join("\n");
}

export function computeBudgetFit(
  price: number | null,
  budgetMin: number,
  budgetMax: number,
): Recommendation["budgetFit"] {
  if (price === null) return "ideal";
  if (price > budgetMax) return "over";
  if (price < budgetMin) return "under";
  return "ideal";
}

export function enrichExpertRecommendations(
  outputs: ExpertRecommendationOutput[],
  candidates: WineWithRelations[],
  input: SommelierInput,
): ExpertRecommendation[] {
  const bySlug = new Map(candidates.map((w) => [w.slug, w]));

  return outputs
    .map((rec) => {
      const wine = bySlug.get(rec.wineSlug);
      if (!wine) return null;
      return {
        ...rec,
        wine,
        budgetFit: computeBudgetFit(
          wine.priceAvg,
          input.budgetMin,
          input.budgetMax,
        ),
      };
    })
    .filter((r): r is ExpertRecommendation => r !== null)
    .sort((a, b) => a.rank - b.rank);
}
