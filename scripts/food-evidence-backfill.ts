/**
 * Food evidence coverage dry-run.
 *
 *   npm run food-evidence:backfill
 *   npm run food-evidence:backfill -- --wine=slug
 *   npm run food-evidence:backfill -- --producer=slug
 *   npm run food-evidence:backfill -- --limit=20
 *   npm run food-evidence:backfill -- --skip-fetch
 *   npm run food-evidence:backfill -- --apply   (NOT used in this task)
 */
import "../lib/load-env";
import { runFoodEvidenceBackfill } from "../lib/food-evidence-backfill";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { foodVersatilityInputFromWine } from "../lib/scoring-v2/wine-score-inputs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import type { WineWithRelations } from "../types";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit?.slice(prefix.length);
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
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length,
  );
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? 0;
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (idx - lo);
}

function largestTie(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let max = 0;
  for (const count of counts.values()) if (count > max) max = count;
  return max;
}

function report(label: string, values: number[]): void {
  const sorted = [...values].sort((a, b) => a - b);
  console.log(`\n=== ${label} (n=${values.length}) ===`);
  console.log(
    `mean=${mean(values).toFixed(2)} median=${median(values).toFixed(2)} sd=${stddev(values).toFixed(2)}`,
  );
  console.log(`min=${sorted[0] ?? "n/a"} max=${sorted[sorted.length - 1] ?? "n/a"}`);
  console.log(
    `p10=${percentile(sorted, 10).toFixed(1)} p25=${percentile(sorted, 25).toFixed(1)} p75=${percentile(sorted, 75).toFixed(1)} p90=${percentile(sorted, 90).toFixed(1)}`,
  );
  console.log(`unique=${new Set(values).size} largestTie=${largestTie(values)}`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const skipFetch = process.argv.includes("--skip-fetch");
  const wineSlug = argValue("wine");
  const producerSlug = argValue("producer");
  const limitRaw = argValue("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  if (apply) {
    console.log("[food-evidence:backfill] APPLY requested but this run will not write.");
  } else {
    console.log("[food-evidence:backfill] DRY RUN (default). No production writes.");
  }

  const catalogRows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(catalogRows as WineWithRelations[]);
  const currentV2 = catalog.map((wine) =>
    calculateFoodVersatility(foodVersatilityInputFromWine(wine)).score,
  );
  report("CURRENT v2 DRY RUN (stored culinary, no refetch)", currentV2);

  const result = await runFoodEvidenceBackfill({
    apply: false,
    wineSlug,
    producerSlug,
    limit,
    skipFetch,
  });

  const simulated = result.rows.map((row) => row.newFood);
  const displayable = result.rows.filter((row) => row.displayable).map((row) => row.newFood);
  report("WITH CLEAN FOOD EVIDENCE (in memory)", simulated);
  report("DISPLAYABLE / moderate+ only", displayable);

  console.log("\n=== Evidence coverage ===");
  console.log(JSON.stringify(result.totals, null, 2));
  console.log(`written=${result.written} dryRun=${result.dryRun}`);
}

main().catch((error) => {
  console.error("[food-evidence:backfill] fatal:", error);
  process.exit(1);
});
