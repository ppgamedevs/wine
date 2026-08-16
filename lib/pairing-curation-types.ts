import type { FoodCategoryId } from "@/lib/food-taxonomy";
import type { FoodPairingBasis, FoodPairingStrength } from "@/lib/schema";

export type ProposalConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface PairingDraft {
  dish: string;
  category: FoodCategoryId;
  rationale: string;
  basis: FoodPairingBasis[];
  confidence: ProposalConfidence;
  strength: FoodPairingStrength;
  styleOnlyWarning: boolean;
  provenanceLocked: boolean;
  dishId?: string;
  romanianDiscovery?: boolean;
  romanianRegion?: string | null;
}
