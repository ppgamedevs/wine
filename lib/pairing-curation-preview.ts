/**
 * In-memory curation score preview. Safe for admin client bundles.
 * Does not write scores. Does not import Node scoring/storage.
 */
import { scoreWineForOccasion } from "@/lib/recommendation/occasion-match";
import type { OccasionId } from "@/lib/recommendation/occasion-match";
import type { FoodPairing, FoodPairingBasis, FoodPairingStrength } from "@/lib/schema";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { foodVersatilityInputFromWine } from "@/lib/scoring-v2/wine-score-inputs";
import type { WineWithRelations } from "@/types";

export interface PreviewDraft {
  dish: string;
  category: string;
  rationale: string;
  basis: FoodPairingBasis[];
  strength?: FoodPairingStrength;
}

export interface ScoreImpactPreview {
  currentFood: {
    score: number;
    level: string;
    displayable: boolean;
    confidence: number;
    provenance: string;
  };
  predictedFood: {
    score: number;
    level: string;
    displayable: boolean;
    confidence: number;
    provenance: string;
  };
  occasions: Array<{
    occasion: OccasionId;
    before: number;
    after: number;
  }>;
  evidenceUpliftWarning: string | null;
}

const KEY_OCCASIONS: OccasionId[] = [
  "sarmale",
  "gratar",
  "pentru-desert",
  "sarbatori",
  "cadou",
];

export function previewCurationImpact(
  wine: WineWithRelations,
  drafts: PreviewDraft[],
): ScoreImpactPreview {
  const current = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
  const proposedPairings: FoodPairing[] = [
    ...wine.foodPairings,
    ...drafts.map((draft) => ({
      dish: draft.dish,
      note: draft.rationale,
      category: draft.category,
      source: "vinintel_curated" as const,
      basis: draft.basis,
      strength: draft.strength,
    })),
  ];
  const predicted = calculateFoodVersatility({
    ...foodVersatilityInputFromWine(wine),
    foodPairings: proposedPairings,
  });
  const afterWine = { ...wine, foodPairings: proposedPairings };
  const occasions = KEY_OCCASIONS.map((occasion) => ({
    occasion,
    before: scoreWineForOccasion(wine, { occasion })?.score ?? 0,
    after: scoreWineForOccasion(afterWine, { occasion })?.score ?? 0,
  }));
  const mostlyEditorial = drafts.every(
    (draft) => !draft.basis.includes("producer_evidence"),
  );
  const largeUplift =
    predicted.confidence - current.confidence >= 15 ||
    predicted.score - current.score >= 14 ||
    predicted.evidenceLevel === "strong";
  return {
    currentFood: {
      score: current.score,
      level: current.evidenceLevel,
      displayable: current.displayable,
      confidence: current.confidence,
      provenance: current.evidenceProvenance,
    },
    predictedFood: {
      score: predicted.score,
      level: predicted.evidenceLevel,
      displayable: predicted.displayable,
      confidence: predicted.confidence,
      provenance: predicted.evidenceProvenance,
    },
    occasions,
    evidenceUpliftWarning:
      mostlyEditorial && largeUplift && drafts.length > 0
        ? "Pairing-urile selectate sunt in principal editoriale; nu exista suficiente date specifice sticlei pentru un scor de incredere ridicat."
        : null,
  };
}

