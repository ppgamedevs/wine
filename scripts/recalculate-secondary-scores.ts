/**
 * Recalculeaza Gift Score v2 si Food Versatility v2.
 * Implicit DRY RUN. Nu atinge Value Score.
 *
 *   npm run scores:recalculate
 *   npm run scores:recalculate -- --wine=slug
 *   npm run scores:recalculate -- --limit=20
 *   npm run scores:recalculate -- --apply
 */
import "../lib/load-env";
import { recalculateSecondaryScores } from "../lib/recalculate-secondary-scores";
import { rankWinesForOccasion } from "../lib/recommendation/occasion-match";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "../lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "../lib/scoring-v2/wine-score-inputs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import type { WineWithRelations } from "../types";
import type { OccasionId } from "../lib/recommendation/occasion-match";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit?.slice(prefix.length);
}

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
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function report(label: string, values: number[]): void {
  const sorted = [...values].sort((a, b) => a - b);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let largestTie = 0;
  for (const count of counts.values()) {
    if (count > largestTie) largestTie = count;
  }
  console.log(`\n=== ${label} (n=${values.length}) ===`);
  console.log(`mean=${mean(values).toFixed(2)} median=${median(values).toFixed(2)} sd=${stddev(values).toFixed(2)}`);
  console.log(`min=${sorted[0] ?? "n/a"} max=${sorted[sorted.length - 1] ?? "n/a"}`);
  console.log(
    `p10=${percentile(sorted, 10).toFixed(1)} p25=${percentile(sorted, 25).toFixed(1)} p75=${percentile(sorted, 75).toFixed(1)} p90=${percentile(sorted, 90).toFixed(1)}`,
  );
  console.log(`>=90=${values.filter((v) => v >= 90).length} >=95=${values.filter((v) => v >= 95).length}`);
  console.log(`unique=${counts.size} largestTie=${largestTie}`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const wineSlug = argValue("wine");
  const limitRaw = argValue("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  if (apply) {
    console.log("[scores:recalculate] APPLY requested. This writes Gift/Food only.");
  } else {
    console.log("[scores:recalculate] DRY RUN (default). Value Score is not touched.");
  }

  const reportData = await recalculateSecondaryScores({
    apply,
    wineSlug,
    limit,
  });

  const gifts = reportData.rows.map((row) => row.newGift);
  const foods = reportData.rows.map((row) => row.newFood);
  report("Gift Score v2 (computed)", gifts);
  report("Food Versatility v2 (computed)", foods);

  const byGiftDelta = [...reportData.rows].sort((a, b) => b.giftDelta - a.giftDelta);
  console.log("\n=== Top 20 Gift increases ===");
  for (const row of byGiftDelta.slice(0, 20)) {
    console.log(
      `${row.slug} ${row.oldGift}->${row.newGift} (${row.giftDelta >= 0 ? "+" : ""}${row.giftDelta}) conf=${row.giftConfidence} :: ${row.giftReasons[0] ?? ""}`,
    );
  }
  console.log("\n=== Top 20 Gift decreases ===");
  for (const row of byGiftDelta.slice(-20).reverse()) {
    console.log(
      `${row.slug} ${row.oldGift}->${row.newGift} (${row.giftDelta}) conf=${row.giftConfidence} :: ${row.giftReasons[0] ?? ""}`,
    );
  }

  const byFoodDelta = [...reportData.rows].sort((a, b) => b.foodDelta - a.foodDelta);
  console.log("\n=== Top 20 Food increases ===");
  for (const row of byFoodDelta.slice(0, 20)) {
    console.log(
      `${row.slug} ${row.oldFood}->${row.newFood} (${row.foodDelta >= 0 ? "+" : ""}${row.foodDelta}) conf=${row.foodConfidence} :: ${row.foodReasons[0] ?? ""}`,
    );
  }
  console.log("\n=== Top 20 Food decreases ===");
  for (const row of byFoodDelta.slice(-20).reverse()) {
    console.log(
      `${row.slug} ${row.oldFood}->${row.newFood} (${row.foodDelta}) conf=${row.foodConfidence} :: ${row.foodReasons[0] ?? ""}`,
    );
  }

  const catalogRows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(catalogRows as WineWithRelations[]);

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

  console.log("\n=== Occasion Match v1 top 10 ===");
  for (const occasion of occasions) {
    const ranked = rankWinesForOccasion(catalog, { occasion }).slice(0, 10);
    const scores = ranked.map((row) => row.score);
    const counts = new Map<number, number>();
    for (const score of scores) counts.set(score, (counts.get(score) ?? 0) + 1);
    let largestTie = 0;
    for (const count of counts.values()) {
      if (count > largestTie) largestTie = count;
    }
    console.log(`\n-- ${occasion} unique=${counts.size} largestTie=${largestTie} --`);
    for (const [index, row] of ranked.entries()) {
      const wine = row.wine as WineWithRelations;
      const gift = calculateGiftScore(giftScoreInputFromWine(wine));
      const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
      console.log(
        `${index + 1}. ${wine.slug} price=${wine.priceAvg} V=${wine.valueScore} G=${gift.score} F=${food.score} M=${row.score} C=${row.confidence} | ${row.reasons.slice(0, 2).join(" / ")}`,
      );
    }
  }

  const budgets = [30, 50, 75, 100] as const;
  const comboOccasions: OccasionId[] = ["sarmale", "gratar", "cadou", "nunta", "pentru-desert"];
  console.log("\n=== Budget combo examples ===");
  for (const budget of budgets) {
    for (const occasion of comboOccasions) {
      const ranked = rankWinesForOccasion(catalog, {
        occasion,
        budgetMin: 0,
        budgetMax: budget,
        budgetSpecified: true,
        budgetConstraint: "hard",
      }).slice(0, 5);
      const over = ranked.filter(
        (row) => (row.wine.priceAvg ?? 0) > budget,
      );
      console.log(
        `sub ${budget} / ${occasion}: ${ranked.map((row) => `${row.wine.slug}(${row.score})`).join(", ") || "none"} overBudget=${over.length}`,
      );
    }
  }

  const { assessRecommendationEligibility } = await import(
    "../lib/recommendation/eligibility"
  );
  const review = catalog.filter(
    (wine) => assessRecommendationEligibility(wine) === "REVIEW_REQUIRED",
  );
  const low = catalog.filter(
    (wine) => assessRecommendationEligibility(wine) === "ELIGIBLE_LOW_CONFIDENCE",
  );
  console.log(
    `\n=== Eligibility ===\nREVIEW_REQUIRED=${review.length} ${review.map((wine) => wine.slug).join(", ") || "(none)"}\nELIGIBLE_LOW_CONFIDENCE=${low.length}`,
  );

  console.log(
    `\n[scores:recalculate] wines=${reportData.total} updated=${reportData.updated} dryRun=${reportData.dryRun}`,
  );
}

main().catch((error) => {
  console.error("[scores:recalculate] fatal:", error);
  process.exit(1);
});
