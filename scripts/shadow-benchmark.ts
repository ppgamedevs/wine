/**
 * Shadow-mode occasion benchmark. Computes v2 in memory. Does not write scores.
 *
 *   npx tsx scripts/shadow-benchmark.ts
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { rankWinesForOccasion, type OccasionId } from "../lib/recommendation/occasion-match";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "../lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "../lib/scoring-v2/wine-score-inputs";
import type { WineWithRelations } from "../types";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function main() {
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);

  const gifts = catalog.map((wine) => calculateGiftScore(giftScoreInputFromWine(wine)));
  const foods = catalog.map((wine) =>
    calculateFoodVersatility(foodVersatilityInputFromWine(wine)),
  );

  const giftConf = gifts.map((row) => row.confidence);
  const giftScores = gifts.map((row) => row.score);
  console.log("\n=== Gift v2 (in memory) ===");
  console.log(
    `n=${gifts.length} mean=${mean(giftScores).toFixed(2)} confMean=${mean(giftConf).toFixed(2)} >=90conf=${giftConf.filter((c) => c >= 90).length} >=95conf=${giftConf.filter((c) => c >= 95).length}`,
  );

  const byWinery = new Map<
    string,
    {
      wines: number;
      quality: number;
      culinary: number;
      curated: number;
      foodConf: number;
      giftConf: number;
      appearances: number;
    }
  >();

  const occasions: OccasionId[] = [
    "oricare",
    "nunta",
    "cadou",
    "cadou-business",
    "cina-romantica",
    "sarmale",
    "gratar",
    "petrecere",
    "sarbatori",
    "pentru-desert",
  ];

  const appearance = new Map<string, number>();

  for (const occasion of occasions) {
    const ranked = rankWinesForOccasion(catalog, { occasion }).slice(0, 10);
    console.log(`\n-- ${occasion} --`);
    console.log(
      "rank\twine\twinery\tprice\tValue\tGift\tGconf\tFood\tFconf\tOcc\tOconf\tlevel\treasons",
    );
    for (const [index, row] of ranked.entries()) {
      const wine = row.wine as WineWithRelations;
      const gift = calculateGiftScore(giftScoreInputFromWine(wine));
      const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
      const winery = wine.winery?.name ?? "";
      appearance.set(winery, (appearance.get(winery) ?? 0) + 1);
      console.log(
        [
          index + 1,
          wine.slug,
          winery,
          wine.priceAvg ?? "",
          wine.valueScore ?? "",
          gift.score,
          gift.confidence,
          food.score,
          food.confidence,
          row.score,
          row.confidence,
          food.evidenceLevel,
          row.reasons.slice(0, 2).join(" / "),
        ].join("\t"),
      );
    }
  }

  console.log("\n=== Evidence coverage by winery ===");
  console.log(
    "Winery\twines\t% quality\t% culinary\t% curated\tavg Food conf\tavg Gift conf\ttop-list hits",
  );
  for (const wine of catalog) {
    const name = wine.winery?.name ?? "(fara crama)";
    const current = byWinery.get(name) ?? {
      wines: 0,
      quality: 0,
      culinary: 0,
      curated: 0,
      foodConf: 0,
      giftConf: 0,
      appearances: 0,
    };
    const gift = calculateGiftScore(giftScoreInputFromWine(wine));
    const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
    current.wines += 1;
    if (wine.qualityFinal != null || wine.criticScore != null || (wine.medals?.length ?? 0) > 0) {
      current.quality += 1;
    }
    if (wine.producerContent?.culinaryPairings?.trim()) current.culinary += 1;
    if ((wine.foodPairings?.length ?? 0) > 0) current.curated += 1;
    current.foodConf += food.confidence;
    current.giftConf += gift.confidence;
    current.appearances = appearance.get(name) ?? 0;
    byWinery.set(name, current);
  }

  const sorted = [...byWinery.entries()].sort((a, b) => b[1].wines - a[1].wines);
  for (const [name, row] of sorted.slice(0, 15)) {
    console.log(
      [
        name,
        row.wines,
        `${Math.round((row.quality / row.wines) * 100)}%`,
        `${Math.round((row.culinary / row.wines) * 100)}%`,
        `${Math.round((row.curated / row.wines) * 100)}%`,
        (row.foodConf / row.wines).toFixed(1),
        (row.giftConf / row.wines).toFixed(1),
        row.appearances,
      ].join("\t"),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
