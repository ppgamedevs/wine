/**
 * Claim-level food evidence.
 * Distinguishes score (internal estimate), confidence, evidence level
 * and whether a precise public number is justified.
 */
import {
  classifyCuratedPairings,
  evidenceContextFromPairingFields,
} from "@/lib/curated-evidence";
import {
  categorizeFoodText,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import type { FoodPairing } from "@/lib/schema";

export const FOOD_EVIDENCE_FORBIDDEN_SCORE_KEYS = [
  "giftScore",
  "foodMatchScore",
  "valueScore",
] as const;

export function assertFoodEvidencePatchHasNoScores(
  patch: Record<string, unknown>,
): void {
  for (const key of FOOD_EVIDENCE_FORBIDDEN_SCORE_KEYS) {
    if (key in patch) {
      throw new Error(
        `Food evidence apply refused: patch contains ${key}. Culinary writes cannot persist scores.`,
      );
    }
  }
}

export interface StoredScoreSnapshot {
  id: number;
  valueScore: number | null;
  giftScore: number | null;
  foodMatchScore: number | null;
}

export function compareScoreSnapshots(
  before: StoredScoreSnapshot[],
  after: StoredScoreSnapshot[],
): { identical: boolean; diffs: number } {
  const afterById = new Map(after.map((row) => [row.id, row]));
  let diffs = 0;
  for (const row of before) {
    const next = afterById.get(row.id);
    if (!next) {
      diffs += 1;
      continue;
    }
    if (
      row.valueScore !== next.valueScore ||
      row.giftScore !== next.giftScore ||
      row.foodMatchScore !== next.foodMatchScore
    ) {
      diffs += 1;
    }
  }
  return { identical: diffs === 0 && before.length === after.length, diffs };
}

export const FOOD_EVIDENCE_LEVELS = [
  "strong",
  "moderate",
  "curated_editorial",
  "style_only",
  "insufficient",
] as const;

export type FoodEvidenceLevel = (typeof FOOD_EVIDENCE_LEVELS)[number];

export const FOOD_EVIDENCE_CLASSES = [
  "CURATED_EXACT",
  "PRODUCER_EXACT",
  "TASTING_SHEET",
  "STYLE_COMPATIBILITY",
  "TYPE_PRIOR",
] as const;

export type FoodEvidenceClass = (typeof FOOD_EVIDENCE_CLASSES)[number];

export type FoodEvidenceSourceType =
  | "curated"
  | "producer_page"
  | "tasting_sheet"
  | "style"
  | "type_prior";

export type FoodExtractionMethod = "deterministic" | "constrained_llm";

export interface FoodEvidenceClaim {
  category: FoodCategoryId;
  dish: string;
  sourceUrl?: string;
  sourceType: FoodEvidenceSourceType;
  excerpt: string;
  extractionMethod: FoodExtractionMethod;
  evidenceClass: FoodEvidenceClass;
  confidence: number;
}

export interface FoodEvidenceAssessment {
  claims: FoodEvidenceClaim[];
  curatedCategories: FoodCategoryId[];
  sourceBackedCategories: FoodCategoryId[];
  structuredCategories: FoodCategoryId[];
  editorialCategories: FoodCategoryId[];
  producerCategories: FoodCategoryId[];
  tastingSheetCategories: FoodCategoryId[];
  evidenceLevel: FoodEvidenceLevel;
  displayable: boolean;
  laundryListRejected: boolean;
  chromeRejected: boolean;
  genericLanguageRejected: boolean;
}

const GENERIC_ALL_PURPOSE = [
  /merge bine (cu |la )?(orice|tot|masa)/i,
  /potrivit (cu |la )?orice/i,
  /se asociaza cu (aproape )?orice/i,
  /vin versatil/i,
  /pentru orice ocazie/i,
  /aperitive,\s*salate/i,
];

const LAUNDRY_HINTS =
  /\b(carne|peste|paste|branzeturi|branza|aperitive|salate|desert|legume|pizza)\b/gi;

export function isGenericAllPurposeLanguage(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ");
  return GENERIC_ALL_PURPOSE.some((pattern) => pattern.test(normalized));
}

export function isLaundryListText(text: string): boolean {
  const categories = categorizeFoodText(text);
  const hits = text.match(LAUNDRY_HINTS) ?? [];
  const uniqueHits = new Set(hits.map((hit) => hit.toLowerCase()));
  if (categories.length >= 6) return true;
  if (uniqueHits.size >= 6) return true;
  if (categories.length >= 4 && isGenericAllPurposeLanguage(text)) return true;
  return false;
}

export function evidenceClassWeight(evidenceClass: FoodEvidenceClass): number {
  switch (evidenceClass) {
    case "CURATED_EXACT":
      return 1;
    case "PRODUCER_EXACT":
      return 0.7;
    case "TASTING_SHEET":
      return 0.6;
    case "STYLE_COMPATIBILITY":
      return 0.25;
    case "TYPE_PRIOR":
      return 0.1;
  }
}

export function resolveFoodEvidenceLevel(input: {
  curatedCount?: number;
  sourceBackedCount: number;
  structuredCount: number;
  editorialCount: number;
  focusedProducerCount: number;
  tastingSheetCount: number;
  hasType: boolean;
  hasSweetness: boolean;
  laundryListRejected?: boolean;
}): FoodEvidenceLevel {
  const wineSpecific = input.sourceBackedCount + input.focusedProducerCount + input.tastingSheetCount;
  if (input.sourceBackedCount >= 2) return "strong";
  if (input.sourceBackedCount >= 1 && wineSpecific >= 2) return "strong";
  if (input.sourceBackedCount >= 1 || input.focusedProducerCount > 0 || input.tastingSheetCount > 0) {
    return "moderate";
  }
  if (input.structuredCount > 0) return "moderate";
  if (input.editorialCount > 0 || (input.curatedCount ?? 0) > 0) return "curated_editorial";
  if (input.hasType && input.hasSweetness) return "style_only";
  if (input.hasType) return "style_only";
  return "insufficient";
}

export function isFoodScoreDisplayable(level: FoodEvidenceLevel): boolean {
  return level === "strong" || level === "moderate" || level === "curated_editorial";
}

export function assessFoodEvidence(input: {
  curatedDishes?: string[];
  foodPairings?: FoodPairing[] | null;
  producerCulinary?: string | null;
  tastingSheetCulinary?: string | null;
  foodEvidence?: FoodEvidenceClaim[] | null;
  type?: string | null;
  sweetness?: string | null;
  alcohol?: number | null;
  acidity?: number | null;
  chromeRejected?: boolean;
  laundryRejected?: boolean;
}): FoodEvidenceAssessment {
  const claims = [...(input.foodEvidence ?? [])];
  const curatedCategories = new Set<FoodCategoryId>();
  const producerCategories = new Set<FoodCategoryId>();
  const tastingSheetCategories = new Set<FoodCategoryId>();
  const pairings = input.foodPairings ?? (input.curatedDishes ?? []).map((dish) => ({ dish }));
  const tiers = classifyCuratedPairings(
    pairings,
    evidenceContextFromPairingFields({
      type: input.type,
      sweetness: input.sweetness,
      alcohol: input.alcohol,
      acidity: input.acidity,
      producerCulinaryPairings: input.producerCulinary,
      foodEvidence: input.foodEvidence,
      culinaryLaundryRejected: input.laundryRejected,
      culinaryChromeRejected: input.chromeRejected,
    }),
  );

  for (const pairing of pairings) {
    for (const category of categorizeFoodText(pairing.dish)) {
      curatedCategories.add(category);
      if (
        !claims.some(
          (claim) =>
            claim.evidenceClass === "CURATED_EXACT" &&
            claim.category === category,
        )
      ) {
        const sourceBacked = tiers.sourceBacked.includes(category);
        claims.push({
          category,
          dish: pairing.dish,
          sourceType: "curated",
          excerpt: pairing.dish,
          extractionMethod: "deterministic",
          evidenceClass: "CURATED_EXACT",
          confidence: sourceBacked ? 86 : tiers.structured.includes(category) ? 58 : 44,
        });
      }
    }
  }

  const producerText = input.producerCulinary?.trim() ?? "";
  const laundryListRejected = producerText ? isLaundryListText(producerText) : false;
  const genericLanguageRejected = producerText
    ? isGenericAllPurposeLanguage(producerText)
    : false;
  const chromeRejected = input.chromeRejected ?? false;

  if (producerText && !laundryListRejected && !chromeRejected && !genericLanguageRejected) {
    for (const category of categorizeFoodText(producerText)) {
      producerCategories.add(category);
    }
  }

  const tastingText = input.tastingSheetCulinary?.trim() ?? "";
  if (tastingText && !isLaundryListText(tastingText)) {
    for (const category of categorizeFoodText(tastingText)) {
      tastingSheetCategories.add(category);
    }
  }

  for (const claim of claims) {
    if (claim.evidenceClass === "CURATED_EXACT") {
      curatedCategories.add(claim.category);
    } else if (claim.evidenceClass === "PRODUCER_EXACT") {
      producerCategories.add(claim.category);
    } else if (claim.evidenceClass === "TASTING_SHEET") {
      tastingSheetCategories.add(claim.category);
    }
  }

  const evidenceLevel = resolveFoodEvidenceLevel({
    curatedCount: curatedCategories.size,
    sourceBackedCount: tiers.sourceBacked.length,
    structuredCount: tiers.structured.length,
    editorialCount: tiers.editorial.length,
    focusedProducerCount: producerCategories.size,
    tastingSheetCount: tastingSheetCategories.size,
    hasType: Boolean(input.type),
    hasSweetness: Boolean(input.sweetness),
    laundryListRejected,
  });

  return {
    claims,
    curatedCategories: [...curatedCategories],
    sourceBackedCategories: tiers.sourceBacked,
    structuredCategories: tiers.structured,
    editorialCategories: tiers.editorial,
    producerCategories: [...producerCategories],
    tastingSheetCategories: [...tastingSheetCategories],
    evidenceLevel,
    displayable: isFoodScoreDisplayable(evidenceLevel),
    laundryListRejected,
    chromeRejected,
    genericLanguageRejected,
  };
}

export function uniqueCategoriesFromClaims(
  claims: FoodEvidenceClaim[],
): FoodCategoryId[] {
  const weighted = new Map<FoodCategoryId, number>();
  for (const claim of claims) {
    const current = weighted.get(claim.category) ?? 0;
    const next = evidenceClassWeight(claim.evidenceClass);
    if (next > current) weighted.set(claim.category, next);
  }
  return [...weighted.entries()]
    .filter(([, weight]) => weight >= evidenceClassWeight("PRODUCER_EXACT"))
    .map(([category]) => category);
}
