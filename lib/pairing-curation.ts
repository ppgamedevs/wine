/**
 * VinIntel pairing curation: drafts, validation, approval, preview.
 * AI/deterministic drafts are never curated until a human approves them.
 * Approval writes only wines.foodPairings. Never writes scores.
 */
import {
  basisProvenanceLabel,
  evidenceContextFromPairingFields,
  hasSafeProducerEvidenceForCategory,
  hasTechnicalSupportForCategory,
  sanitizeCuratedBasis,
} from "@/lib/curated-evidence";
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
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type {
  FoodPairing,
  FoodPairingStrength,
} from "@/lib/schema";
import { isAutochthonousGrapeMix } from "@/lib/scoring";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";

export const PAIRING_CURATOR_ID = "admin";

export const EDITORIAL_DISHES: Array<{
  dish: string;
  category: FoodCategoryId;
  aliases: string[];
}> = [
  { dish: "Sarmale", category: "sarmale", aliases: ["sarma", "sarmalute"] },
  { dish: "Mici", category: "grilled_meat", aliases: ["mititei"] },
  { dish: "Carne de vita la gratar", category: "grilled_meat", aliases: ["vita la gratar"] },
  { dish: "Ceafa de porc", category: "pork", aliases: ["porc", "cotlet"] },
  { dish: "Carne de miel", category: "festive_traditional", aliases: ["miel"] },
  { dish: "Pasare", category: "poultry", aliases: ["pui", "rata"] },
  { dish: "Peste alb", category: "fish", aliases: [] },
  { dish: "Somon", category: "fish", aliases: ["peste gras"] },
  { dish: "Fructe de mare", category: "fish", aliases: [] },
  { dish: "Paste", category: "pasta", aliases: ["spaghetti"] },
  { dish: "Pizza", category: "pizza", aliases: [] },
  { dish: "Branzeturi proaspete", category: "cheese", aliases: ["telemea"] },
  { dish: "Branzeturi maturate", category: "cheese", aliases: ["branza matura"] },
  { dish: "Legume", category: "vegetable", aliases: [] },
  { dish: "Salate", category: "vegetable", aliases: ["salata"] },
  { dish: "Aperitive", category: "vegetable", aliases: [] },
  { dish: "Cozonac", category: "dessert", aliases: [] },
  { dish: "Pasca", category: "dessert", aliases: [] },
  { dish: "Desert cu fructe", category: "dessert", aliases: [] },
  { dish: "Desert cu ciocolata", category: "chocolate", aliases: ["ciocolata"] },
];

export type { PairingDraft, ProposalConfidence } from "@/lib/pairing-curation-types";

export interface PairingValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
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
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

function styleDrafts(wine: WineWithRelations): PairingDraft[] {
  const type = wine.type;
  const sweet = wine.sweetness ?? "sec";
  const drafts: PairingDraft[] = [];
  const push = (
    dish: string,
    category: FoodCategoryId,
    rationale: string,
    strength: FoodPairingStrength = "good",
  ) => {
    drafts.push({
      dish,
      category,
      rationale,
      basis: ["verified_style", "editorial_judgment"],
      confidence: "MEDIUM",
      strength,
      styleOnlyWarning: true,
      provenanceLocked: true,
    });
  };

  if (type === "red" && (sweet === "sec" || sweet === "demisec")) {
    push("Sarmale", "sarmale", "Un rosu sec sau demisec din acest stil este o alegere editoriala potrivita pentru sarmale.");
    push("Mici", "grilled_meat", "Un rosu sec din acest stil este o alegere editoriala potrivita pentru preparate consistente la gratar.");
    push("Branzeturi maturate", "cheese", "Branzeturile maturate sunt o asociere editoriala clasica pentru un rosu sec.");
  } else if (type === "red") {
    push("Branzeturi maturate", "cheese", "Un rosu mai dulce se asociaza editorial cu branzeturi maturate.");
    push("Desert cu ciocolata", "chocolate", "Dulceata verificata sustine o asociere editoriala cu desert de ciocolata.");
  }

  if (type === "white" && sweet === "sec") {
    push("Peste alb", "fish", "Un alb sec este o alegere editoriala potrivita pentru peste cu carne alba.");
    push("Fructe de mare", "fish", "Stilul alb sec se asociaza editorial cu fructe de mare.");
    push("Branzeturi proaspete", "cheese", "Branzeturile proaspete sunt o asociere editoriala usoara pentru un alb sec.");
  } else if (type === "white" && (sweet === "demisec" || sweet === "demidulce")) {
    push("Aperitive", "vegetable", "Un alb demisec este o alegere editoriala pentru aperitive.");
    push("Peste alb", "fish", "Stilul alb demisec ramane potrivit editorial pentru peste delicat.");
  } else if (type === "white" && sweet === "dulce") {
    push("Desert cu fructe", "dessert", "Dulceata verificata sustine o asociere editoriala cu desert de fructe.");
    push("Cozonac", "dessert", "Un alb dulce este o alegere editoriala pentru cozonac.");
  }

  if (type === "rose") {
    push("Aperitive", "vegetable", "Un roze este o alegere editoriala versatila pentru aperitive.");
    push("Salate", "vegetable", "Stilul roze se asociaza editorial cu salate.");
    push("Peste alb", "fish", "Roze sec sau demisec merge editorial cu peste delicat.");
  }

  if (type === "sparkling") {
    push("Aperitive", "vegetable", "Un spumant este o alegere editoriala pentru aperitive.");
    push("Fructe de mare", "fish", "Spumantul se asociaza editorial cu fructe de mare.");
  }

  if (type === "dessert" || type === "orange") {
    push("Branzeturi maturate", "cheese", "Stilul verificat sustine o asociere editoriala cu branzeturi maturate.");
  }

  if (wine.alcohol != null && wine.alcohol >= 14 && type === "red") {
    drafts.push({
      dish: "Ceafa de porc",
      category: "pork",
      rationale: "Alcoolul verificat ridicat sustine o asociere editoriala cu preparate de porc consistente.",
      basis: ["verified_style", "technical_data", "editorial_judgment"],
      confidence: "MEDIUM",
      strength: "good",
      styleOnlyWarning: false,
      provenanceLocked: true,
    });
  }

  return drafts;
}

function producerDrafts(wine: WineWithRelations): PairingDraft[] {
  const context = wineEvidenceContext(wine);
  const claims = wine.producerContent?.foodEvidence ?? [];
  const drafts: PairingDraft[] = [];
  const seen = new Set<FoodCategoryId>();

  for (const claim of claims) {
    const category = claim.category as FoodCategoryId;
    if (seen.has(category)) continue;
    if (!hasSafeProducerEvidenceForCategory(context, category)) continue;
    seen.add(category);
    drafts.push({
      dish: editorialDishForCategory(category),
      category,
      rationale: "Producatorul mentioneaza aceasta asociere. Categoria editoriala propusa ramane de aprobat de un recenzor.",
      basis: ["producer_evidence"],
      confidence: "HIGH",
      strength: "good",
      styleOnlyWarning: false,
      provenanceLocked: true,
    });
  }

  if (drafts.length === 0) {
    for (const category of categorizeFoodText(context.producerCulinary ?? "")) {
      if (seen.has(category)) continue;
      if (!hasSafeProducerEvidenceForCategory(context, category)) continue;
      seen.add(category);
      drafts.push({
        dish: editorialDishForCategory(category),
        category,
        rationale: "Textul oficial al producatorului sustine aceasta categorie. Aprobarea ramane umana.",
        basis: ["producer_evidence"],
        confidence: "HIGH",
        strength: "good",
        styleOnlyWarning: false,
        provenanceLocked: true,
      });
    }
  }

  return drafts;
}

export function generatePairingDrafts(wine: WineWithRelations): PairingDraft[] {
  const fromProducer = producerDrafts(wine);
  const fromStyle = styleDrafts(wine);
  const merged: PairingDraft[] = [];
  const used = new Set<FoodCategoryId>();

  for (const draft of [...fromProducer, ...fromStyle]) {
    if (used.has(draft.category)) continue;
    used.add(draft.category);
    merged.push(draft);
    if (merged.length >= 5) break;
  }

  return merged.slice(0, 5);
}

export function lockDraftBasis(wine: WineWithRelations, draft: PairingDraft): PairingDraft {
  const context = wineEvidenceContext(wine);
  const sanitized = sanitizeCuratedBasis(draft.basis, context, draft.category);
  if (sanitized.rejectedProducerClaim) {
    throw new Error("basis=producer_evidence necesita evidenta oficiala pentru aceasta categorie.");
  }
  if (
    draft.basis.includes("technical_data") &&
    !hasTechnicalSupportForCategory(context, draft.category)
  ) {
    return { ...draft, basis: sanitized.basis };
  }
  return { ...draft, basis: sanitized.basis };
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
      !hasSafeProducerEvidenceForCategory(context, draft.category)
    ) {
      issues.push({
        level: "error",
        code: "fake_producer_basis",
        message: "Nu poti marca o asociere ca evidenta de producator fara sursa oficiala.",
      });
    }
    if (!draft.dish.trim()) {
      issues.push({ level: "error", code: "empty_dish", message: "Felul nu poate fi gol." });
    }
    if (!draft.rationale.trim()) {
      issues.push({
        level: "error",
        code: "empty_rationale",
        message: "Motivarea nu poate fi goala.",
      });
    }
    if (SENSORY_CLAIM_RE.test(draft.rationale)) {
      issues.push({
        level: "error",
        code: "unsupported_sensory",
        message: "Motivarea nu poate inventa tanin, stejar sau arome de sticla.",
      });
    }
    const cats = categorizeFoodText(draft.dish);
    if (cats.length === 0) {
      issues.push({
        level: "error",
        code: "unknown_category",
        message: `Categoria pentru "${draft.dish}" nu este in taxonomie.`,
      });
    }
    const folded = fold(draft.dish);
    if (foldedDishes.has(folded)) {
      issues.push({
        level: "error",
        code: "duplicate_dish",
        message: `Fel duplicat: ${draft.dish}.`,
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
    if (next.some((pairing) => fold(pairing.dish) === fold(draft.dish))) continue;
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
