/**
 * Food evidence coverage, dry-run, and producer-batched apply.
 *
 *   npm run food-evidence:backfill
 *   npm run food-evidence:backfill -- --inventory
 *   npm run food-evidence:backfill -- --wine=slug
 *   npm run food-evidence:backfill -- --producer=slug
 *   npm run food-evidence:backfill -- --limit=20
 *   npm run food-evidence:backfill -- --skip-fetch
 *   npm run food-evidence:backfill -- --apply --producer=budureasca
 */
import "../lib/load-env";
import { runFoodEvidenceBackfill } from "../lib/food-evidence-backfill";
import {
  inventoryWineCulinarySources,
  summarizeCulinarySourceInventory,
} from "../lib/food-evidence-inventory";
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
    values.reduce((sum, value) => (sum + (value - avg) ** 2), 0) / values.length,
  );
}

function report(label: string, values: number[]): void {
  const sorted = [...values].sort((a, b) => a - b);
  console.log(`\n=== ${label} (n=${values.length}) ===`);
  console.log(
    `mean=${mean(values).toFixed(2)} median=${median(values).toFixed(2)} sd=${stddev(values).toFixed(2)}`,
  );
  console.log(`min=${sorted[0] ?? "n/a"} max=${sorted[sorted.length - 1] ?? "n/a"}`);
}

async function loadVerifiedCatalog(): Promise<WineWithRelations[]> {
  const catalogRows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  return normalizeWineRows(catalogRows as WineWithRelations[]);
}

function printWineryStats(
  rows: Array<{
    winery: string;
    winerySlug: string;
    displayable: boolean;
    evidenceLevel: string;
    producerPairing: boolean;
    tastingSheet: boolean;
    fetchFailed: boolean;
    noSource: boolean;
    laundryRejected: boolean;
    chromeRejected: boolean;
    willWrite: boolean;
  }>,
): void {
  const byWinery = new Map<
    string,
    {
      wines: number;
      newEvidence: number;
      strong: number;
      moderate: number;
      styleOnly: number;
      noSource: number;
      fetchFailed: number;
      laundry: number;
      chrome: number;
    }
  >();
  for (const row of rows) {
    const key = row.winery || row.winerySlug || "unknown";
    const current = byWinery.get(key) ?? {
      wines: 0,
      newEvidence: 0,
      strong: 0,
      moderate: 0,
      styleOnly: 0,
      noSource: 0,
      fetchFailed: 0,
      laundry: 0,
      chrome: 0,
    };
    current.wines += 1;
    if (row.willWrite) current.newEvidence += 1;
    if (row.evidenceLevel === "strong") current.strong += 1;
    if (row.evidenceLevel === "moderate") current.moderate += 1;
    if (row.evidenceLevel === "style_only") current.styleOnly += 1;
    if (row.noSource) current.noSource += 1;
    if (row.fetchFailed) current.fetchFailed += 1;
    if (row.laundryRejected) current.laundry += 1;
    if (row.chromeRejected) current.chrome += 1;
    byWinery.set(key, current);
  }
  console.log("\n=== By winery ===");
  for (const [name, stats] of [...byWinery.entries()].sort(
    (left, right) => right[1].wines - left[1].wines,
  )) {
    console.log(
      `${name}: wines=${stats.wines} writes=${stats.newEvidence} strong=${stats.strong} moderate=${stats.moderate} styleOnly=${stats.styleOnly} noSource=${stats.noSource} fetchFailed=${stats.fetchFailed} laundry=${stats.laundry} chrome=${stats.chrome}`,
    );
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const skipFetch = process.argv.includes("--skip-fetch");
  const inventoryOnly = process.argv.includes("--inventory");
  const wineSlug = argValue("wine");
  const producerSlug = argValue("producer");
  const limitRaw = argValue("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  if (inventoryOnly) {
    const catalog = await loadVerifiedCatalog();
    const coverage = summarizeCulinarySourceInventory(
      catalog.map(inventoryWineCulinarySources),
    );
    console.log("[food-evidence:backfill] SOURCE INVENTORY (no fetch)");
    console.log(JSON.stringify(coverage, null, 2));
    return;
  }

  if (apply) {
    console.log(
      "[food-evidence:backfill] APPLY producerContent culinary fields only. Scores are not written.",
    );
  } else {
    console.log("[food-evidence:backfill] DRY RUN (default). No production writes.");
  }

  const catalog = await loadVerifiedCatalog();
  const currentV2 = catalog.map((wine) =>
    calculateFoodVersatility(foodVersatilityInputFromWine(wine)).score,
  );
  report("CURRENT v2 DRY RUN (stored culinary, no refetch)", currentV2);

  const result = await runFoodEvidenceBackfill({
    apply,
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
  console.log("\n=== Source coverage ===");
  console.log(JSON.stringify(result.sourceCoverage, null, 2));
  printWineryStats(result.rows);
  console.log(`\nproposedWrites=${result.proposedWrites.length}`);
  for (const write of result.proposedWrites.slice(0, 40)) {
    console.log(
      `WRITE ${write.action} ${write.slug} claims=${write.claimCount} type=${write.sourceType} method=${write.extractionMethod}`,
    );
  }
  if (result.proposedWrites.length > 40) {
    console.log(`... ${result.proposedWrites.length - 40} more writes`);
  }
  console.log(`\nreviewExclusions=${result.reviewExclusions.length}`);
  for (const item of result.reviewExclusions.slice(0, 30)) {
    console.log(`REVIEW ${item.slug} ${item.reason}`);
  }
  console.log(
    `\nwritten=${result.written} dryRun=${result.dryRun} scoresIdentical=${result.scoreSnapshots.identical} scoreDiffs=${result.scoreSnapshots.diffs}`,
  );
}

main().catch((error) => {
  console.error("[food-evidence:backfill] fatal:", error);
  process.exit(1);
});
