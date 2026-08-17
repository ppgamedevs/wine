/**
 * Read-only provenance audit and dry-run repair proposals.
 * Does not mutate pairings unless a caller explicitly applies a patch.
 */
import { evidenceContextFromPairingFields } from "@/lib/curated-evidence";
import { classifyProducerProvenance } from "@/lib/pairing/producer-provenance";
import { classifyProducerText } from "@/lib/pairing/producer-text-class";
import { hasTechnicalSupportForCategory } from "@/lib/curated-evidence";
import { categorizeFoodText, type FoodCategoryId } from "@/lib/food-taxonomy";
import type { FoodPairing, FoodPairingBasis } from "@/lib/schema";
import type { WineWithRelations } from "@/types";

export type ProvenanceAuditClass =
  | "VALID_EXACT"
  | "VALID_NEAR_EXACT"
  | "RELATED_ONLY"
  | "NO_CULINARY_SUPPORT";

export interface ProvenanceAuditRow {
  slug: string;
  wineName: string;
  dish: string;
  currentBasis: FoodPairingBasis[];
  classification: ProvenanceAuditClass;
  producerTextClass: ReturnType<typeof classifyProducerText>;
  proposedBasis?: FoodPairingBasis[];
}

export function auditPairingProvenance(
  wine: WineWithRelations,
  pairing: FoodPairing,
): ProvenanceAuditRow {
  const context = evidenceContextFromPairingFields({
    type: wine.type,
    sweetness: wine.sweetness,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    producerCulinaryPairings: wine.producerContent?.culinaryPairings,
    foodEvidence: wine.producerContent?.foodEvidence,
    culinaryLaundryRejected: wine.producerContent?.culinaryLaundryRejected,
    culinaryChromeRejected: wine.producerContent?.culinaryChromeRejected,
  });
  const category = (pairing.category ??
    categorizeFoodText(pairing.dish)[0] ??
    "vegetable") as FoodCategoryId;
  const provenance = classifyProducerProvenance(context, pairing.dish, category);
  const producerTextClass = classifyProducerText(
    wine.producerContent?.culinaryPairings,
  );
  let classification: ProvenanceAuditClass = "NO_CULINARY_SUPPORT";
  if (producerTextClass === "PRODUCER_DESCRIPTION") {
    classification = "NO_CULINARY_SUPPORT";
  } else if (provenance === "EXACT_PRODUCER") {
    classification = "VALID_EXACT";
  } else if (provenance === "RELATED_PRODUCER_CATEGORY") {
    classification = "RELATED_ONLY";
  }

  const currentBasis = pairing.basis ?? [];
  const hasProducer = currentBasis.includes("producer_evidence");
  let proposedBasis: FoodPairingBasis[] | undefined;
  if (
    hasProducer &&
    (classification === "RELATED_ONLY" || classification === "NO_CULINARY_SUPPORT")
  ) {
    const next: FoodPairingBasis[] = currentBasis.filter(
      (item) => item !== "producer_evidence",
    );
    if (!next.includes("verified_style")) next.push("verified_style");
    if (!next.includes("editorial_judgment")) next.push("editorial_judgment");
    if (hasTechnicalSupportForCategory(context, category) && !next.includes("technical_data")) {
      next.push("technical_data");
    }
    proposedBasis = next;
  }

  return {
    slug: wine.slug,
    wineName: wine.name,
    dish: pairing.dish,
    currentBasis,
    classification,
    producerTextClass,
    proposedBasis,
  };
}

export function auditWineProvenance(wine: WineWithRelations): ProvenanceAuditRow[] {
  return wine.foodPairings
    .filter((pairing) => pairing.basis?.includes("producer_evidence"))
    .map((pairing) => auditPairingProvenance(wine, pairing));
}

export function proposedProvenanceRepair(
  wine: WineWithRelations,
  row: ProvenanceAuditRow,
): FoodPairing[] | null {
  if (!row.proposedBasis) return null;
  return wine.foodPairings.map((pairing) => {
    if (pairing.dish !== row.dish) return pairing;
    return {
      ...pairing,
      basis: row.proposedBasis,
    };
  });
}
