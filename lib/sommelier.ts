import type { ExpertRecommendationOutput } from "@/lib/ai/schemas";
import { ROMANIAN_DESSERT_KEYWORDS } from "@/lib/dessert-pairings";
import { sanitizeExpertNotesForDownstream } from "@/lib/editorial-claim-validator";
import { formatProducerContentForSommelier } from "@/lib/producer-page-extract";
import {
  rankWinesForOccasion,
  type BudgetConstraint,
  type RecommendationEligibility,
} from "@/lib/recommendation";
import { formatWineMedalsForSommelier } from "@/lib/wine-medals";
import type { WineWithRelations } from "@/types";

export type ColorPreference = "any" | "red" | "white" | "rose" | "sparkling";
export type SweetnessPreference = "any" | "sec" | "demisec" | "demidulce" | "dulce";

export interface SommelierInput {
  budgetMin: number;
  budgetMax: number;
  /** True only when the user explicitly mentioned a budget or price limit. */
  budgetSpecified: boolean;
  occasion: OccasionId;
  color: ColorPreference;
  sweetness: SweetnessPreference;
  preferredWinerySlugs: string[];
  /** Illegal, unethical or absurd food pairing requests (dolphin, etc.). */
  absurdRequest: boolean;
  budgetConstraint?: BudgetConstraint;
  dish?: string | null;
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

/** Deterministic contextual recommendation. matchScore is Occasion Match. */
export interface Recommendation {
  wine: WineWithRelations;
  matchScore: number;
  confidence: number;
  reasons: string[];
  budgetFit: "under" | "ideal" | "over";
  eligibility: RecommendationEligibility;
}

/** Expert AI recommendation enriched with wine data for UI. */
export interface ExpertRecommendation extends ExpertRecommendationOutput {
  wine: WineWithRelations;
  budgetFit: "under" | "ideal" | "over";
}

export function recommendWines(
  allWines: WineWithRelations[],
  input: SommelierInput,
  limit = 5,
): Recommendation[] {
  const ranked = rankWinesForOccasion(allWines, {
    occasion: input.occasion,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    budgetSpecified: input.budgetSpecified,
    budgetConstraint: input.budgetConstraint ?? (input.budgetSpecified ? "hard" : "none"),
    color: input.color,
    sweetness: input.sweetness,
    dish: input.dish,
    preferredWinerySlugs: input.preferredWinerySlugs,
  });

  return ranked.slice(0, limit).map((rec) => {
    const wine = rec.wine as WineWithRelations;
    const reasons = [...rec.reasons];
    if (
      wine.winery?.slug &&
      input.preferredWinerySlugs.includes(wine.winery.slug)
    ) {
      reasons.unshift(`Din ${wine.winery.name}, crama preferata.`);
    }
    return {
      wine,
      matchScore: rec.score,
      confidence: rec.confidence,
      reasons,
      budgetFit: computeBudgetFit(wine.priceAvg, input.budgetMin, input.budgetMax),
      eligibility: rec.eligibility,
    };
  });
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
  const producerSummary = formatProducerContentForSommelier(wine.producerContent);

  const safeExpert = sanitizeExpertNotesForDownstream(wine.expertNotes, {
    type: wine.type,
    sweetness: wine.sweetness,
    grapeVarieties: wine.grapeVarieties,
    regionName: wine.region?.name ?? null,
    wineryName: wine.winery?.name ?? null,
    vintage: wine.vintage,
    tastingNotes: wine.tastingNotes,
    producerContent: wine.producerContent,
    producerPageUrl: wine.producerPageUrl,
    tastingSheetUrl: wine.tastingSheetUrl,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    sugar: wine.sugar,
    foodPairings: wine.foodPairings,
    medals: wine.medals,
  });

  const expert = safeExpert
    ? `
EXPERT_NOTES (doar sectiuni sustinute de evidenta; nu trata restul ca fapt):
- Istorie: ${safeExpert.history || "N/A"}
- Terroir: ${safeExpert.terroirSecrets || "N/A"}
- Vintage: ${safeExpert.vintageQuirks || "N/A"}
- Pairing science: ${safeExpert.pairingScience || "N/A"}
- Greseli comune: ${safeExpert.commonMistakes || "N/A"}
- Aging: ${safeExpert.agingPotential || "N/A"}
- Value insight: ${safeExpert.valueInsight || "N/A"}
- Things you should know: ${safeExpert.thingsYouShouldKnow.join(" | ") || "N/A"}`
    : "(expert_notes absente sau nesustinute; nu inventa taninuri/stejar/arome)";

  return `---
slug: ${wine.slug}
Nume: ${wine.name}${wine.vintage ? ` ${wine.vintage}` : ""}
Crama: ${wine.winery?.name ?? "N/A"} | Regiune: ${wine.region?.name ?? "N/A"}
Tip: ${wine.type} | Dulceata: ${wine.sweetness ?? "N/A"} | ${wine.priceAvg ?? "?"} RON
Soiuri: ${grapes}
Scoruri: Value ${wine.valueScore ?? "N/A"}, Gift ${wine.giftScore ?? "N/A"}, Food ${wine.foodMatchScore ?? "N/A"}
${medalsSummary ? `Medalii: ${medalsSummary}` : "Medalii: niciuna in baza de date"}
${producerSummary ? `Producator (site): ${producerSummary}` : ""}
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
