import {
  generatePairingDrafts,
  previewCurationImpact,
  validatePairingDrafts,
  type PairingDraft,
  type ScoreImpactPreview,
} from "@/lib/pairing-curation";
import { partitionPairingDrafts } from "@/lib/pairing-curation-match";
import { INSUFFICIENT_PAIRING_DATA_MESSAGE } from "@/lib/pairing/generate-romanian-drafts";
import type { FoodCategoryId } from "@/lib/food-taxonomy";
import type { WineWithRelations } from "@/types";

export interface ProducerClaimView {
  dish: string;
  category: string;
  excerpt: string;
  sourceUrl: string | null;
  sourceType: string;
  confidence: number;
}

export interface CurationCard {
  id: number;
  slug: string;
  name: string;
  winery: string;
  winerySlug: string;
  vintage: number | null;
  type: string;
  sweetness: string | null;
  grapes: string[];
  priceAvg: number | null;
  valueScore: number | null;
  alcohol: number | null;
  acidity: number | null;
  sugar: number | null;
  producerCulinary: string | null;
  producerClaims: ProducerClaimView[];
  existingPairings: Array<{
    dish: string;
    note?: string;
    category?: string;
    source?: string;
    curatedAt?: string;
    curatedBy?: string;
    basis?: string[];
    strength?: string;
  }>;
  drafts: PairingDraft[];
  warnings: string[];
  impact: ScoreImpactPreview;
  previewWine: WineWithRelations;
}

export function buildCurationCard(wine: WineWithRelations): CurationCard {
  const drafts = generatePairingDrafts(wine);
  const { newDrafts } = partitionPairingDrafts(drafts, wine.foodPairings);
  const issues = validatePairingDrafts(wine, newDrafts);
  return {
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    winery: wine.winery?.name ?? "",
    winerySlug: wine.winery?.slug ?? "",
    vintage: wine.vintage,
    type: wine.type,
    sweetness: wine.sweetness,
    grapes: (wine.grapeVarieties ?? []).map((grape) => grape.name),
    priceAvg: wine.priceAvg,
    valueScore: wine.valueScore,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    sugar: wine.sugar,
    producerCulinary: wine.producerContent?.culinaryPairings ?? null,
    producerClaims: (wine.producerContent?.foodEvidence ?? []).map((claim) => ({
      dish: claim.dish,
      category: claim.category,
      excerpt: claim.excerpt,
      sourceUrl: claim.sourceUrl ?? null,
      sourceType: claim.sourceType,
      confidence: claim.confidence,
    })),
    existingPairings: wine.foodPairings.map((pairing) => ({
      dish: pairing.dish,
      note: pairing.note,
      category: pairing.category,
      source: pairing.source,
      curatedAt: pairing.curatedAt,
      curatedBy: pairing.curatedBy,
      basis: pairing.basis,
      strength: pairing.strength,
    })),
    drafts: newDrafts,
    warnings: [
      ...issues.map((issue) => issue.message),
      ...(newDrafts.length < 4 ? [INSUFFICIENT_PAIRING_DATA_MESSAGE] : []),
    ],
    impact: previewCurationImpact(wine, newDrafts),
    previewWine: wine,
  };
}

export function draftFromEdit(
  draft: PairingDraft,
  dish: string,
  rationale: string,
): PairingDraft {
  return {
    ...draft,
    dish: dish.trim(),
    rationale: rationale.trim(),
    category: draft.category as FoodCategoryId,
    basis: draft.basis.includes("editorial_judgment")
      ? draft.basis
      : [...draft.basis, "editorial_judgment"],
  };
}
