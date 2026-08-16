import type { FoodVersatilityInput } from "@/lib/scoring-v2/food-versatility";
import type { GiftScoreInput } from "@/lib/scoring-v2/gift-score";
import type { FoodPairing, ProducerPageContent, WineMedal } from "@/lib/schema";

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
    foodPairings: wine.foodPairings,
    producerCulinaryPairings: wine.producerContent?.culinaryPairings,
  };
}
