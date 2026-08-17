/**
 * VinIntel pairing curation: drafts, validation, approval, preview.
 * AI/deterministic drafts are never curated until a human approves them.
 * Approval writes only wines.foodPairings. Never writes scores.
 */
import {
  basisProvenanceLabel,
  evidenceContextFromPairingFields,
  hasTechnicalSupportForCategory,
  sanitizeCuratedBasis,
} from "@/lib/curated-evidence";
import { hasExactOrNearExactProducerEvidence } from "@/lib/pairing/producer-provenance";
import {
  assessFoodEvidence,
  assertFoodEvidencePatchHasNoScores,
} from "@/lib/food-evidence";
import {
  categorizeFoodText,
  foodCategoryLabel,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import { rankWinesForOccasion } from "@/lib/recommendation/occasion-match";
import type { OccasionId } from "@/lib/recommendation/occasion-match";
import {
  previewCurationImpact,
  type ScoreImpactPreview,
} from "@/lib/pairing-curation-preview";
import {
  EDITORIAL_DISHES,
  draftMatchesExistingPairing,
  foldPairingText,
} from "@/lib/pairing-curation-match";
import { generateRomanianPairingDrafts } from "@/lib/pairing/generate-romanian-drafts";
import { findRomanianDishByName } from "@/lib/pairing/romanian-dishes";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type { FoodPairing } from "@/lib/schema";
import { isAutochthonousGrapeMix } from "@/lib/scoring";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";

export const PAIRING_CURATOR_ID = "admin";

export {
  EDITORIAL_DISHES,
  draftMatchesExistingPairing,
  partitionPairingDrafts,
  prepareApprovalDrafts,
} from "@/lib/pairing-curation-match";

export type { PairingDraft, ProposalConfidence } from "@/lib/pairing-curation-types";

export interface PairingValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  dish?: string;
}

export class PairingCurationError extends Error {
  readonly dish?: string;
  readonly code?: string;

  constructor(message: string, options?: { dish?: string; code?: string }) {
    super(message);
    this.name = "PairingCurationError";
    this.dish = options?.dish;
    this.code = options?.code;
  }
}

export type { ScoreImpactPreview };
export { previewCurationImpact };

const SENSORY_CLAIM_RE =
  /tanin|stejar|barrique|baric|arome de|fructe negre|corp (mediu|plin)|la nas|pe palat|gust complex|note de vanilie/i;

const KEY_OCCASIONS: OccasionId[] = [
  "sarmale",
  "gratar",
  "pentru-desert",
  "sarbatori",
  "cadou",
];

function fold(value: string): string {
  return foldPairingText(value);
}

function grapeNames(wine: WineWithRelations): string[] {
  return (wine.grapeVarieties ?? []).map((grape) => grape.name);
}

export function isVinIntelCuratedPairing(pairing: FoodPairing): boolean {
  return pairing.source === "vinintel_curated";
}

export function editorialDishForCategory(category: FoodCategoryId): string {
  return EDITORIAL_DISHES.find((item) => item.category === category)?.dish ?? foodCategoryLabel(category);
}

export function wineEvidenceContext(wine: WineWithRelations) {
  return evidenceContextFromPairingFields({
    type: wine.type,
    sweetness: wine.sweetness,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    producerCulinaryPairings: wine.producerContent?.culinaryPairings,
    foodEvidence: wine.producerContent?.foodEvidence,
    culinaryLaundryRejected: wine.producerContent?.culinaryLaundryRejected,
    culinaryChromeRejected: wine.producerContent?.culinaryChromeRejected,
  });
}

export function generatePairingDrafts(wine: WineWithRelations): PairingDraft[] {
  return generateRomanianPairingDrafts(wine);
}

export function lockDraftBasis(wine: WineWithRelations, draft: PairingDraft): PairingDraft {
  const context = wineEvidenceContext(wine);
  const exactProducer = hasExactOrNearExactProducerEvidence(
    context,
    draft.dish,
    draft.category,
  );
  if (draft.basis.includes("producer_evidence") && !exactProducer) {
    throw new Error("basis=producer_evidence necesita evidenta oficiala pentru aceasta categorie.");
  }
  const sanitized = sanitizeCuratedBasis(draft.basis, context, draft.category);
  if (sanitized.rejectedProducerClaim && !exactProducer) {
    throw new Error("basis=producer_evidence necesita evidenta oficiala pentru aceasta categorie.");
  }
  const basis = exactProducer
    ? [...new Set(["producer_evidence" as const, ...sanitized.basis])]
    : sanitized.basis;
  if (
    draft.basis.includes("technical_data") &&
    !hasTechnicalSupportForCategory(context, draft.category)
  ) {
    return { ...draft, basis };
  }
  return { ...draft, basis };
}

export function validatePairingDrafts(
  wine: WineWithRelations,
  drafts: PairingDraft[],
): PairingValidationIssue[] {
  const issues: PairingValidationIssue[] = [];
  const foldedDishes = new Set<string>();
  const categories = new Set<FoodCategoryId>();
  const context = wineEvidenceContext(wine);

  for (const draft of drafts) {
    if (
      draft.basis.includes("producer_evidence") &&
      !hasExactOrNearExactProducerEvidence(context, draft.dish, draft.category)
    ) {
      issues.push({
        level: "error",
        code: "fake_producer_basis",
        message: "Nu poti marca o asociere ca evidenta de producator fara sursa oficiala.",
        dish: draft.dish,
      });
    }
    if (!draft.dish.trim()) {
      issues.push({
        level: "error",
        code: "empty_dish",
        message: "Felul nu poate fi gol.",
        dish: draft.dish,
      });
    }
    if (!draft.rationale.trim()) {
      issues.push({
        level: "error",
        code: "empty_rationale",
        message: "Motivarea nu poate fi goala.",
        dish: draft.dish,
      });
    }
    if (SENSORY_CLAIM_RE.test(draft.rationale)) {
      issues.push({
        level: "error",
        code: "unsupported_sensory",
        message: "Motivarea nu poate inventa tanin, stejar sau arome de sticla.",
        dish: draft.dish,
      });
    }
    const cats = categorizeFoodText(draft.dish);
    const libraryDish = findRomanianDishByName(draft.dish);
    if (cats.length === 0 && !libraryDish) {
      issues.push({
        level: "error",
        code: "unknown_category",
        message: `Categoria pentru "${draft.dish}" nu este in taxonomie.`,
        dish: draft.dish,
      });
    }
    if (draftMatchesExistingPairing(draft, wine.foodPairings)) {
      issues.push({
        level: "error",
        code: "already_approved",
        message: `"${draft.dish}" este deja aprobat pentru acest vin.`,
        dish: draft.dish,
      });
    }
    const folded = fold(draft.dish);
    if (foldedDishes.has(folded)) {
      issues.push({
        level: "error",
        code: "duplicate_dish",
        message: `Fel duplicat: ${draft.dish}.`,
        dish: draft.dish,
      });
    }
    foldedDishes.add(folded);
    for (const alias of EDITORIAL_DISHES.find((item) => fold(item.dish) === folded)?.aliases ?? []) {
      foldedDishes.add(fold(alias));
    }
    for (const category of cats) categories.add(category);
  }

  const batchFolds = drafts.map((draft) => fold(draft.dish));
  if (batchFolds.includes("mici") && batchFolds.includes("mititei")) {
    issues.push({
      level: "error",
      code: "duplicate_synonym",
      message: "Mici si mititei sunt aceeasi categorie.",
    });
  }

  if (categories.size >= 5) {
    issues.push({
      level: "warning",
      code: "too_versatile",
      message: "Acest vin ar deveni neobisnuit de versatil fata de datele disponibile.",
    });
  }

  const hasDessert = [...categories].some((id) => id === "dessert" || id === "chocolate");
  if (hasDessert && (wine.sweetness === "sec" || wine.type === "sparkling")) {
    const producerHasDessert = categorizeFoodText(
      wine.producerContent?.culinaryPairings ?? "",
    ).some((id) => id === "dessert" || id === "chocolate");
    if (!producerHasDessert) {
      issues.push({
        level: "warning",
        code: "dessert_on_dry",
        message: "Desert pe un vin sec, fara evidenta de producator pentru desert.",
      });
    }
  }

  return issues;
}

export { basisProvenanceLabel };

export function toApprovedFoodPairings(
  drafts: PairingDraft[],
  existing: FoodPairing[],
  curatedAt = new Date().toISOString(),
): FoodPairing[] {
  const next = [...existing];
  for (const draft of drafts) {
    if (draftMatchesExistingPairing(draft, next)) continue;
    next.push({
      dish: draft.dish,
      note: draft.rationale,
      category: draft.category,
      source: "vinintel_curated",
      curatedAt,
      curatedBy: PAIRING_CURATOR_ID,
      basis: draft.basis,
      strength: draft.strength,
    });
  }
  return next;
}

export function buildCurationWritePatch(
  nextPairings: FoodPairing[],
): { foodPairings: FoodPairing[] } {
  const patch = { foodPairings: nextPairings };
  assertFoodEvidencePatchHasNoScores(patch);
  return patch;
}

export function assertCurationAdmin(authenticated: boolean): void {
  if (!authenticated) {
    throw new Error("Pairing approval requires admin authentication.");
  }
}

export function assertShadowUnchanged(): void {
  if (getSecondaryScoringMode() === "live") {
    throw new Error("Curation must not run while public secondary scoring is live.");
  }
}

export interface QueueScores {
  slug: string;
  winerySlug: string;
  productValue: number;
  coverage: number;
  reasons: string[];
}

export type CurationReviewStatus = "curated" | "pending";

/**
 * Queue ranking uses only stable wine properties.
 * Review status (foodPairings) must not change priority or batch membership.
 */
export function scoreCurationQueuePriority(
  catalog: WineWithRelations[],
): QueueScores[] {
  const rankingCatalog = catalog.map((wine) => ({
    ...wine,
    foodPairings: [],
  }));
  const topHits = new Map<string, number>();
  for (const occasion of KEY_OCCASIONS) {
    for (const row of rankWinesForOccasion(rankingCatalog, { occasion }).slice(
      0,
      12,
    )) {
      const wine = row.wine as WineWithRelations;
      topHits.set(wine.slug, (topHits.get(wine.slug) ?? 0) + 1);
    }
  }

  const culinaryByWinery = new Map<string, { total: number; culinary: number }>();
  for (const wine of catalog) {
    const slug = wine.winery?.slug ?? "unknown";
    const current = culinaryByWinery.get(slug) ?? { total: 0, culinary: 0 };
    current.total += 1;
    if (wine.producerContent?.culinaryPairings?.trim()) current.culinary += 1;
    culinaryByWinery.set(slug, current);
  }

  return catalog.map((wine) => {
    const assessment = assessFoodEvidence({
      curatedDishes: [],
      producerCulinary: wine.producerContent?.culinaryPairings,
      type: wine.type,
      sweetness: wine.sweetness,
    });
    const grapes = grapeNames(wine);
    const reasons: string[] = [];
    let productValue = wine.valueScore ?? 0;
    if ((wine.valueScore ?? 0) >= 75) {
      productValue += 16;
      reasons.push("high Value Score");
    }
    if (isAutochthonousGrapeMix(grapes)) {
      productValue += 14;
      reasons.push("Romanian variety");
    }
    const hits = topHits.get(wine.slug) ?? 0;
    if (hits > 0) {
      productValue += hits * 6;
      reasons.push(`top-list ${hits}`);
    }
    const price = wine.priceAvg;
    if (price != null && price < 100) {
      productValue += price < 50 ? 10 : price < 75 ? 8 : 6;
      reasons.push("price band");
    }

    const winerySlug = wine.winery?.slug ?? "unknown";
    const winery = culinaryByWinery.get(winerySlug);
    const culinaryPct = winery && winery.total > 0 ? winery.culinary / winery.total : 0;
    let coverage = 0;
    if (assessment.producerCategories.length === 0) {
      coverage += 24;
      reasons.push("no producer culinary");
    }
    if (culinaryPct < 0.2) {
      coverage += 20;
      reasons.push("underrepresented winery");
    }
    if (winerySlug === "balla-geza") {
      coverage += 28;
      reasons.push("Balla Geza coverage");
    }
    if (winerySlug === "murfatlar") {
      coverage += 16;
      reasons.push("Murfatlar coverage");
    }
    if (winerySlug === "cramele-recas") coverage -= 12;

    return {
      slug: wine.slug,
      winerySlug,
      productValue,
      coverage,
      reasons,
    };
  });
}

export function wineCurationStatus(
  wine: Pick<WineWithRelations, "foodPairings">,
): CurationReviewStatus {
  return wine.foodPairings.length > 0 ? "curated" : "pending";
}

export function scoreCurationQueues(catalog: WineWithRelations[]): QueueScores[] {
  return scoreCurationQueuePriority(catalog);
}

const WINERY_BATCH_BOUNDS: Array<{ slug: string; min: number; max: number }> = [
  { slug: "balla-geza", min: 7, max: 8 },
  { slug: "budureasca", min: 5, max: 7 },
  { slug: "avincis", min: 4, max: 5 },
  { slug: "crama-gabai", min: 2, max: 3 },
  { slug: "murfatlar", min: 1, max: 2 },
  { slug: "cramele-recas", min: 3, max: 5 },
];

export function selectBalancedCurationBatch(
  catalog: WineWithRelations[],
  limit = 30,
): WineWithRelations[] {
  const scores = scoreCurationQueuePriority(catalog);
  const bySlug = new Map(scores.map((row) => [row.slug, row]));
  const ranked = [...catalog].sort((left, right) => {
    const leftScore = bySlug.get(left.slug);
    const rightScore = bySlug.get(right.slug);
    const leftMix = (leftScore?.coverage ?? 0) * 0.65 + (leftScore?.productValue ?? 0) * 0.35;
    const rightMix = (rightScore?.coverage ?? 0) * 0.65 + (rightScore?.productValue ?? 0) * 0.35;
    if (rightMix !== leftMix) return rightMix - leftMix;
    return left.slug.localeCompare(right.slug);
  });

  const selected: WineWithRelations[] = [];
  const counts = new Map<string, number>();

  const take = (wine: WineWithRelations, max: number) => {
    const slug = wine.winery?.slug ?? "unknown";
    if ((counts.get(slug) ?? 0) >= max) return;
    if (selected.some((item) => item.slug === wine.slug)) return;
    selected.push(wine);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  };

  for (const bound of WINERY_BATCH_BOUNDS) {
    const pool = ranked.filter((wine) => wine.winery?.slug === bound.slug);
    for (const wine of pool) {
      if ((counts.get(bound.slug) ?? 0) >= bound.min) break;
      take(wine, bound.max);
    }
  }

  for (const wine of ranked) {
    if (selected.length >= limit) break;
    const bound = WINERY_BATCH_BOUNDS.find((item) => item.slug === wine.winery?.slug);
    take(wine, bound?.max ?? 4);
  }

  return selected.slice(0, limit);
}

export function publicPairingAttribution(pairing: FoodPairing): string {
  return isVinIntelCuratedPairing(pairing)
    ? "Recomandare VinIntel"
    : "Asociere evaluata";
}

export function publicProducerAttribution(): string {
  return "Recomandarea producatorului";
}
