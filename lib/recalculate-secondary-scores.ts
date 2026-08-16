import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";
import { recordScoreSnapshot } from "@/lib/score-history";
import {
  FOOD_VERSATILITY_ALGORITHM_VERSION,
  GIFT_SCORE_ALGORITHM_VERSION,
} from "@/lib/scoring-v2/constants";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "@/lib/scoring-v2/wine-score-inputs";
import { normalizeWineRows } from "@/lib/normalize-wine";
import type { WineWithRelations } from "@/types";

export interface SecondaryScoreRow {
  slug: string;
  name: string;
  type: string;
  priceAvg: number | null;
  valueScore: number | null;
  oldGift: number | null;
  newGift: number;
  giftDelta: number;
  giftConfidence: number;
  oldFood: number | null;
  newFood: number;
  foodDelta: number;
  foodConfidence: number;
  giftReasons: string[];
  foodReasons: string[];
}

export interface RecalculateSecondaryScoresOptions {
  apply?: boolean;
  wineSlug?: string;
  limit?: number;
}

export interface RecalculateSecondaryScoresReport {
  dryRun: boolean;
  algorithm: {
    gift: number;
    food: number;
  };
  total: number;
  updated: number;
  rows: SecondaryScoreRow[];
}

export async function recalculateSecondaryScores(
  options: RecalculateSecondaryScoresOptions = {},
): Promise<RecalculateSecondaryScoresReport> {
  const apply = options.apply === true;
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: options.wineSlug
      ? eq(wines.slug, options.wineSlug)
      : eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  const limited =
    options.limit != null ? catalog.slice(0, options.limit) : catalog;

  const reportRows: SecondaryScoreRow[] = [];
  let updated = 0;

  for (const wine of limited) {
    const gift = calculateGiftScore(giftScoreInputFromWine(wine));
    const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
    const oldGift = wine.giftScore;
    const oldFood = wine.foodMatchScore;
    const giftChanged = oldGift !== gift.score;
    const foodChanged = oldFood !== food.score;

    reportRows.push({
      slug: wine.slug,
      name: wine.name,
      type: wine.type,
      priceAvg: wine.priceAvg,
      valueScore: wine.valueScore,
      oldGift,
      newGift: gift.score,
      giftDelta: gift.score - (oldGift ?? 0),
      giftConfidence: gift.confidence,
      oldFood,
      newFood: food.score,
      foodDelta: food.score - (oldFood ?? 0),
      foodConfidence: food.confidence,
      giftReasons: gift.breakdown.slice(0, 3).map((item) => item.detail),
      foodReasons: food.breakdown.slice(0, 3).map((item) => item.detail),
    });

    if (apply && (giftChanged || foodChanged)) {
      await db
        .update(wines)
        .set({
          giftScore: gift.score,
          foodMatchScore: food.score,
        })
        .where(eq(wines.id, wine.id));

      await recordScoreSnapshot({
        wineId: wine.id,
        priceAvg: wine.priceAvg,
        valueScore: wine.valueScore,
        giftScore: gift.score,
        foodMatchScore: food.score,
        overpricedRisk: wine.overpricedRisk,
        algorithmVersion: GIFT_SCORE_ALGORITHM_VERSION,
        confidencePercent: Math.round((gift.confidence + food.confidence) / 2),
        changeReason: "gift_food_recalculation",
        changedBy: "system:gift-food-v2",
      });
      updated += 1;
    }
  }

  return {
    dryRun: !apply,
    algorithm: {
      gift: GIFT_SCORE_ALGORITHM_VERSION,
      food: FOOD_VERSATILITY_ALGORITHM_VERSION,
    },
    total: reportRows.length,
    updated,
    rows: reportRows,
  };
}
