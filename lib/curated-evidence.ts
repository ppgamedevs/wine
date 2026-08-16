/**
 * Curated pairing evidence tiers.
 *
 * Editorial trust (human approved) is not the same as evidentiary strength
 * (how wine-specific the basis is). Food Versatility uses the latter.
 * Dish Match may still treat an approved dish as a strong recommendation.
 */
import {
  isCulinaryChromeText,
  isTastingNoteLeak,
  sanitizeCulinaryText,
} from "@/lib/culinary-extract";
import {
  categorizeFoodText,
  isDessertCategory,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import type { FoodPairing, FoodPairingBasis } from "@/lib/schema";

export interface ProducerClaimLike {
  category: string;
  dish: string;
  excerpt: string;
  evidenceClass: string;
}

function excerptLooksLikeLaundry(text: string): boolean {
  return categorizeFoodText(text).length >= 4;
}

export const CURATED_EVIDENCE_TIERS = [
  "source_backed",
  "structured",
  "editorial",
] as const;

export type CuratedEvidenceTier = (typeof CURATED_EVIDENCE_TIERS)[number];

export interface PairingEvidenceContext {
  type?: string | null;
  sweetness?: string | null;
  alcohol?: number | null;
  acidity?: number | null;
  producerCulinary?: string | null;
  foodEvidence?: ProducerClaimLike[] | null;
  culinaryLaundryRejected?: boolean;
  culinaryChromeRejected?: boolean;
}

export function pairingCategories(pairing: FoodPairing): FoodCategoryId[] {
  if (pairing.category) {
    const fromField = categorizeFoodText(pairing.category);
    if (fromField.length > 0) return fromField;
  }
  return categorizeFoodText(pairing.dish);
}

function producerTextUsable(context: PairingEvidenceContext): string {
  const text = sanitizeCulinaryText(context.producerCulinary) ?? "";
  if (!text.trim()) return "";
  if (context.culinaryLaundryRejected || context.culinaryChromeRejected) return "";
  if (isCulinaryChromeText(text) || isTastingNoteLeak(text) || excerptLooksLikeLaundry(text)) {
    return "";
  }
  return text;
}

function excerptSupportsCategory(excerpt: string, category: FoodCategoryId): boolean {
  const cleaned = excerpt.trim();
  if (!cleaned) return false;
  if (isCulinaryChromeText(cleaned) || isTastingNoteLeak(cleaned)) return false;
  if (excerptLooksLikeLaundry(cleaned)) return false;
  const cats = categorizeFoodText(cleaned);
  if (!cats.includes(category)) return false;
  if (isDessertCategory(category)) {
    const dessertCats = cats.filter(isDessertCategory);
    return dessertCats.length > 0 && cats.length <= 2;
  }
  return cats.length <= 3;
}

export function hasSafeProducerEvidenceForCategory(
  context: PairingEvidenceContext,
  category: FoodCategoryId,
): boolean {
  for (const claim of context.foodEvidence ?? []) {
    if (claim.category !== category) continue;
    if (
      claim.evidenceClass !== "PRODUCER_EXACT" &&
      claim.evidenceClass !== "TASTING_SHEET"
    ) {
      continue;
    }
    if (excerptSupportsCategory(claim.excerpt || claim.dish, category)) {
      return true;
    }
  }

  const text = producerTextUsable(context);
  if (!text) return false;
  const cats = categorizeFoodText(text);
  if (!cats.includes(category)) return false;
  if (isDessertCategory(category)) {
    return cats.filter(isDessertCategory).length > 0 && cats.length <= 2;
  }
  return true;
}

export function hasTechnicalSupportForCategory(
  context: PairingEvidenceContext,
  category: FoodCategoryId,
): boolean {
  const alcohol = context.alcohol;
  const type = (context.type ?? "").toLowerCase();
  if (
    alcohol != null &&
    Number.isFinite(alcohol) &&
    alcohol >= 14 &&
    type === "red" &&
    (category === "pork" || category === "beef" || category === "grilled_meat")
  ) {
    return true;
  }
  return false;
}

export function claimedBasisList(pairing: FoodPairing): FoodPairingBasis[] {
  return pairing.basis ?? [];
}

/**
 * Effective tier after re-validating claimed basis against wine evidence.
 * Legacy rows without basis/source are editorial, never producer-backed.
 */
export function curatedEvidenceTier(
  pairing: FoodPairing,
  context: PairingEvidenceContext,
): CuratedEvidenceTier {
  const claimed = claimedBasisList(pairing);
  const categories = pairingCategories(pairing);
  const producerOk = categories.some((category) =>
    hasSafeProducerEvidenceForCategory(context, category),
  );
  const technicalOk = categories.some((category) =>
    hasTechnicalSupportForCategory(context, category),
  );

  if (claimed.includes("producer_evidence") && producerOk) {
    return "source_backed";
  }
  if (
    (claimed.includes("technical_data") && technicalOk) ||
    claimed.includes("verified_style")
  ) {
    return "structured";
  }
  if (claimed.includes("editorial_judgment") || claimed.length === 0) {
    return "editorial";
  }
  return "editorial";
}

export function sanitizeCuratedBasis(
  claimed: FoodPairingBasis[],
  context: PairingEvidenceContext,
  category: FoodCategoryId,
): { basis: FoodPairingBasis[]; rejectedProducerClaim: boolean } {
  const unique = [...new Set(claimed)];
  const rejectedProducerClaim =
    unique.includes("producer_evidence") &&
    !hasSafeProducerEvidenceForCategory(context, category);

  const basis: FoodPairingBasis[] = [];
  if (unique.includes("producer_evidence") && !rejectedProducerClaim) {
    basis.push("producer_evidence");
  }
  if (
    unique.includes("technical_data") &&
    hasTechnicalSupportForCategory(context, category)
  ) {
    basis.push("technical_data");
  }
  if (unique.includes("verified_style") || Boolean(context.type)) {
    if (unique.includes("verified_style") || !basis.includes("producer_evidence")) {
      basis.push("verified_style");
    }
  }
  if (unique.includes("editorial_judgment") || basis.length === 0) {
    if (!basis.includes("editorial_judgment") && !basis.includes("producer_evidence")) {
      basis.push("editorial_judgment");
    } else if (unique.includes("editorial_judgment") && !basis.includes("editorial_judgment")) {
      basis.push("editorial_judgment");
    }
  }
  if (basis.length === 0) basis.push("editorial_judgment");
  return { basis: [...new Set(basis)], rejectedProducerClaim };
}

export function evidenceContextFromPairingFields(input: {
  type?: string | null;
  sweetness?: string | null;
  alcohol?: number | null;
  acidity?: number | null;
  producerCulinaryPairings?: string | null;
  foodEvidence?: ProducerClaimLike[] | null;
  culinaryLaundryRejected?: boolean;
  culinaryChromeRejected?: boolean;
}): PairingEvidenceContext {
  return {
    type: input.type,
    sweetness: input.sweetness,
    alcohol: input.alcohol,
    acidity: input.acidity,
    producerCulinary: input.producerCulinaryPairings,
    foodEvidence: input.foodEvidence,
    culinaryLaundryRejected: input.culinaryLaundryRejected,
    culinaryChromeRejected: input.culinaryChromeRejected,
  };
}

export function classifyCuratedPairings(
  pairings: FoodPairing[] | null | undefined,
  context: PairingEvidenceContext,
): {
  sourceBacked: FoodCategoryId[];
  structured: FoodCategoryId[];
  editorial: FoodCategoryId[];
} {
  const sourceBacked = new Set<FoodCategoryId>();
  const structured = new Set<FoodCategoryId>();
  const editorial = new Set<FoodCategoryId>();

  for (const pairing of pairings ?? []) {
    const tier = curatedEvidenceTier(pairing, context);
    for (const category of pairingCategories(pairing)) {
      if (tier === "source_backed") sourceBacked.add(category);
      else if (tier === "structured") structured.add(category);
      else editorial.add(category);
    }
  }

  return {
    sourceBacked: [...sourceBacked],
    structured: [...structured],
    editorial: [...editorial],
  };
}

export function publicFoodProvenanceCaption(
  provenance: "source_backed" | "structured" | "editorial" | "style",
): string | null {
  if (provenance === "source_backed") return "Date culinare sustinute de surse";
  if (provenance === "structured" || provenance === "editorial") {
    return "Recomandare editoriala VinIntel";
  }
  return null;
}

export function basisProvenanceLabel(basis: FoodPairingBasis[]): string {
  if (basis.includes("producer_evidence")) return "Recomandarea producatorului";
  if (basis.includes("technical_data") || basis.includes("verified_style")) {
    return "Stil verificat / judecata editoriala";
  }
  return "Judecata editoriala";
}
