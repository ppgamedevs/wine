import type { ExpertRecommendationOutput } from "@/lib/ai/schemas";
import { sanitizeExpertNotesForDownstream } from "@/lib/editorial-claim-validator";
import { formatProducerContentForSommelier } from "@/lib/producer-page-extract";
import { recommendWinesLegacy } from "@/lib/recommendation/legacy-recommend";
import {
  rankWinesForOccasion,
  type RecommendationEligibility,
  type RecommendationStatus,
} from "@/lib/recommendation";
import { usesPublicOccasionMatch } from "@/lib/recommendation/occasion-match-mode";
import {
  resolvePublicSecondaryScores,
  sanitizePublicSecondaryCopy,
} from "@/lib/scoring-v2/public-secondary-display";
import { usesSecondaryV2Ranking } from "@/lib/scoring-v2/secondary-scoring-mode";
import { formatWineMedalsForSommelier } from "@/lib/wine-medals";
import type { WineWithRelations } from "@/types";

export {
  OCCASIONS,
  getOccasion,
  type ColorPreference,
  type OccasionId,
  type SommelierInput,
  type SweetnessPreference,
} from "@/lib/sommelier-occasions";
import type { SommelierInput } from "@/lib/sommelier-occasions";

/** Deterministic contextual recommendation. matchScore is Occasion Match. */
export interface Recommendation {
  wine: WineWithRelations;
  matchScore: number;
  confidence: number;
  reasons: string[];
  budgetFit: "under" | "ideal" | "over";
  eligibility: RecommendationEligibility;
  status: RecommendationStatus;
}

/** Expert AI recommendation enriched with wine data for UI. */
export interface ExpertRecommendation extends ExpertRecommendationOutput {
  wine: WineWithRelations;
  budgetFit: "under" | "ideal" | "over";
}

export function recommendWinesLive(
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
      status: rec.status,
    };
  });
}

export function recommendWines(
  allWines: WineWithRelations[],
  input: SommelierInput,
  limit = 5,
): Recommendation[] {
  if (!usesSecondaryV2Ranking() || !usesPublicOccasionMatch()) {
    return recommendWinesLegacy(allWines, input, limit).map((rec) => ({
      wine: rec.wine,
      matchScore: rec.matchScore,
      confidence: 50,
      reasons: rec.reasons,
      budgetFit: rec.budgetFit,
      eligibility: "ELIGIBLE" as const,
      status: "reasonable" as const,
    }));
  }
  return recommendWinesLive(allWines, input, limit);
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
  const secondary = resolvePublicSecondaryScores(wine);
  const publicScores = [
    `Value ${wine.valueScore ?? "N/A"}`,
    secondary.gift.score != null ? `Gift ${secondary.gift.score}` : null,
    secondary.food.score != null ? `Food ${secondary.food.score}` : null,
  ]
    .filter((part): part is string => part != null)
    .join(", ");

  const safeExpert = sanitizeExpertNotesForDownstream(wine.expertNotes, {
    type: wine.type,
    sweetness: null,
    grapeVarieties: wine.grapeVarieties,
    regionName: wine.region?.name ?? null,
    wineryName: wine.winery?.name ?? null,
    vintage: null,
    tastingNotes: wine.tastingNotes,
    producerContent: wine.producerContent,
    producerPageUrl: wine.producerPageUrl,
    tastingSheetUrl: wine.tastingSheetUrl,
    alcohol: null,
    acidity: null,
    sugar: null,
    foodPairings: wine.foodPairings,
    medals: wine.medals,
  });

  const expert = safeExpert
    ? `
EXPERT_NOTES (doar sectiuni sustinute de evidenta; nu trata restul ca fapt):
- Istorie: ${safeExpert.history || "N/A"}
- Terroir: ${safeExpert.terroirSecrets || "N/A"}
- Pairing science: ${safeExpert.pairingScience || "N/A"}
- Greseli comune: ${safeExpert.commonMistakes || "N/A"}
- Aging: ${safeExpert.agingPotential || "N/A"}
- Value insight: ${safeExpert.valueInsight || "N/A"}
- Things you should know: ${safeExpert.thingsYouShouldKnow.join(" | ") || "N/A"}`
    : "(expert_notes absente sau nesustinute; nu inventa taninuri/stejar/arome)";

  return sanitizePublicSecondaryCopy(`---
slug: ${wine.slug}
Nume: ${wine.name}
Crama: ${wine.winery?.name ?? "N/A"} | Regiune: ${wine.region?.name ?? "N/A"}
Tip: ${wine.type} | ${wine.priceAvg ?? "?"} RON
Soiuri: ${grapes}
Scoruri publice: ${publicScores}
${medalsSummary ? `Medalii: ${medalsSummary}` : "Medalii: niciuna in baza de date"}
${producerSummary ? `Producator (site): ${producerSummary}` : ""}
Note: ${wine.tastingNotes ?? "N/A"}
Pairing-uri mancare: ${pairings || "N/A"}
Pairing-uri desert: ${dessertPairings || "N/A"}
${expert}
---`, wine);
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
