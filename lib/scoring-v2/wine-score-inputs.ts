import type {
  FoodEvidenceClaim,
  FoodEvidenceClass,
  FoodEvidenceSourceType,
  FoodExtractionMethod,
} from "@/lib/food-evidence";
import type { FoodCategoryId } from "@/lib/food-taxonomy";
import { sanitizeCulinaryText } from "@/lib/culinary-extract";
import type { FoodVersatilityInput } from "@/lib/scoring-v2/food-versatility";
import type { GiftScoreInput } from "@/lib/scoring-v2/gift-score";
import type { FoodPairing, ProducerFoodEvidenceClaim, ProducerPageContent, WineMedal } from "@/lib/schema";

const FOOD_CLASSES = new Set<FoodEvidenceClass>([
  "CURATED_EXACT",
  "PRODUCER_EXACT",
  "TASTING_SHEET",
  "STYLE_COMPATIBILITY",
  "TYPE_PRIOR",
]);

export function toFoodEvidenceClaims(
  raw: ProducerFoodEvidenceClaim[] | FoodEvidenceClaim[] | null | undefined,
): FoodEvidenceClaim[] {
  if (!raw?.length) return [];
  const claims: FoodEvidenceClaim[] = [];
  for (const item of raw) {
    if (!FOOD_CLASSES.has(item.evidenceClass as FoodEvidenceClass)) continue;
    claims.push({
      category: item.category as FoodCategoryId,
      dish: item.dish,
      ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
      sourceType: item.sourceType as FoodEvidenceSourceType,
      excerpt: item.excerpt,
      extractionMethod: item.extractionMethod as FoodExtractionMethod,
      evidenceClass: item.evidenceClass as FoodEvidenceClass,
      confidence: item.confidence,
    });
  }
  return claims;
}

export interface WineLikeForSecondaryScores {
  priceAvg?: number | null;
  currentPrice?: number | null;
  type?: string | null;
  sweetness?: string | null;
  grapeVarieties?: Array<string | { name: string }>;
  region?: { name?: string | null } | null;
  winery?: { name?: string | null } | null;
  vintage?: number | null;
  valueScore?: number | null;
  estimatedQuality?: number | null;
  qualityFinal?: number | null;
  qualityEffective?: number | null;
  medals?: WineMedal[] | null;
  criticScore?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  alcohol?: number | null;
  acidity?: number | null;
  foodPairings?: FoodPairing[] | null;
  producerContent?: ProducerPageContent | null;
}

function grapeNames(wine: WineLikeForSecondaryScores): string[] {
  return (wine.grapeVarieties ?? []).map((entry) =>
    typeof entry === "string" ? entry : entry.name,
  );
}

export function giftScoreInputFromWine(
  wine: WineLikeForSecondaryScores,
  priceOverride?: number,
): GiftScoreInput {
  return {
    price: priceOverride ?? wine.currentPrice ?? wine.priceAvg,
    type: wine.type,
    grapeVarieties: grapeNames(wine),
    region: wine.region?.name,
    wineryName: wine.winery?.name,
    vintage: wine.vintage,
    valueScore: wine.valueScore,
    estimatedQuality: wine.estimatedQuality,
    qualityFinal: wine.qualityFinal,
    qualityEffective: wine.qualityEffective,
    medals: wine.medals,
    criticScore: wine.criticScore,
    ratingAvg: wine.ratingAvg,
    communityScore: wine.communityScore,
    producerPageUrl: wine.producerPageUrl,
    tastingSheetUrl: wine.tastingSheetUrl,
    alcohol: wine.alcohol,
    sweetness: wine.sweetness,
  };
}

export function foodVersatilityInputFromWine(
  wine: WineLikeForSecondaryScores,
): FoodVersatilityInput {
  return {
    type: wine.type,
    sweetness: wine.sweetness,
    acidity: wine.acidity,
    alcohol: wine.alcohol,
    foodPairings: wine.foodPairings,
    producerCulinaryPairings: sanitizeCulinaryText(
      wine.producerContent?.culinaryPairings,
    ) || null,
    foodEvidence: toFoodEvidenceClaims(wine.producerContent?.foodEvidence),
    culinaryChromeRejected: wine.producerContent?.culinaryChromeRejected,
    culinaryLaundryRejected: wine.producerContent?.culinaryLaundryRejected,
  };
}
