/**
 * Read-only baseline for Gift Score and Food Match (legacy stored values)
 * plus current occasion top 10. Does not write to the database.
 *
 *   npx tsx scripts/baseline-secondary-scores.ts
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { OCCASIONS, recommendWines, type OccasionId } from "../lib/sommelier";
import type { WineWithRelations } from "../types";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function tieStats(values: number[]): { unique: number; largestTie: number; identicalTies: number } {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let largestTie = 0;
  let identicalTies = 0;
  for (const count of counts.values()) {
    if (count > largestTie) largestTie = count;
    if (count > 1) identicalTies += count;
  }
  return { unique: counts.size, largestTie, identicalTies };
}

function reportDistribution(label: string, values: number[]): void {
  const sorted = [...values].sort((a, b) => a - b);
  const ties = tieStats(values);
  console.log(`\n=== ${label} (n=${values.length}) ===`);
  console.log(`mean=${mean(values).toFixed(2)}`);
  console.log(`median=${median(values).toFixed(2)}`);
  console.log(`min=${sorted[0] ?? "n/a"}`);
  console.log(`max=${sorted[sorted.length - 1] ?? "n/a"}`);
  console.log(`p10=${percentile(sorted, 10).toFixed(2)}`);
  console.log(`p25=${percentile(sorted, 25).toFixed(2)}`);
  console.log(`p75=${percentile(sorted, 75).toFixed(2)}`);
  console.log(`p90=${percentile(sorted, 90).toFixed(2)}`);
  console.log(`>=90=${values.filter((v) => v >= 90).length}`);
  console.log(`>=95=${values.filter((v) => v >= 95).length}`);
  console.log(`unique=${ties.unique}`);
  console.log(`identical-score wines=${ties.identicalTies}`);
  console.log(`largest tie group=${ties.largestTie}`);
}

async function main() {
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  const gift = catalog
    .map((wine) => wine.giftScore)
    .filter((score): score is number => score != null);
  const food = catalog
    .map((wine) => wine.foodMatchScore)
    .filter((score): score is number => score != null);

  console.log(`[baseline] catalog wines=${catalog.length}`);
  console.log(`[baseline] giftScore present=${gift.length} missing=${catalog.length - gift.length}`);
  console.log(`[baseline] foodMatchScore present=${food.length} missing=${catalog.length - food.length}`);

  reportDistribution("giftScore (stored, legacy)", gift);
  reportDistribution("foodMatchScore (stored, legacy)", food);

  const topGift = [...catalog]
    .filter((wine) => wine.giftScore != null)
    .sort((a, b) => (b.giftScore ?? 0) - (a.giftScore ?? 0))
    .slice(0, 20);
  console.log("\n=== Top 20 Gift (stored) ===");
  for (const [index, wine] of topGift.entries()) {
    console.log(
      `${index + 1}. ${wine.slug} gift=${wine.giftScore} value=${wine.valueScore} price=${wine.priceAvg} type=${wine.type}`,
    );
  }

  const topFood = [...catalog]
    .filter((wine) => wine.foodMatchScore != null)
    .sort((a, b) => (b.foodMatchScore ?? 0) - (a.foodMatchScore ?? 0))
    .slice(0, 20);
  console.log("\n=== Top 20 Food Match (stored) ===");
  for (const [index, wine] of topFood.entries()) {
    console.log(
      `${index + 1}. ${wine.slug} food=${wine.foodMatchScore} value=${wine.valueScore} price=${wine.priceAvg} type=${wine.type}`,
    );
  }

  console.log("\n=== Current occasion top 10 (legacy recommendWines) ===");
  for (const occasion of OCCASIONS) {
    const recs = recommendWines(
      catalog,
      {
        budgetMin: 0,
        budgetMax: 9999,
        budgetSpecified: false,
        occasion: occasion.id as OccasionId,
        color: "any",
        sweetness: "any",
        preferredWinerySlugs: [],
        absurdRequest: false,
      },
      10,
    );
    console.log(`\n-- ${occasion.id} --`);
    for (const [index, rec] of recs.entries()) {
      console.log(
        `${index + 1}. ${rec.wine.slug} match=${rec.matchScore} value=${rec.wine.valueScore} gift=${rec.wine.giftScore} food=${rec.wine.foodMatchScore} price=${rec.wine.priceAvg}`,
      );
    }
  }
}

main().catch((error) => {
  console.error("[baseline] fatal:", error);
  process.exit(1);
});
