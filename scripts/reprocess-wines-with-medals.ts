/**
 * Reproceseaza medalii din descrieri/note si recalculeaza Value Score.
 *
 *   npx tsx scripts/reprocess-wines-with-medals.ts
 *   npx tsx scripts/reprocess-wines-with-medals.ts --dry-run
 *   npx tsx scripts/reprocess-wines-with-medals.ts --concurrency=6 --limit=10
 *   npx tsx scripts/reprocess-wines-with-medals.ts --no-fetch   # doar text catalog
 */
import { asc } from "drizzle-orm";
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  extractWineMedalsFromText,
  hasMedalExtractionSourceText,
} from "../lib/extract-wine-medals-from-text";
import { fetchMedalSourcePageText } from "../lib/fetch-wine-medal-source-text";
import { wines } from "../lib/schema";
import {
  calculateValueScore,
  valueScoreInputFromWine,
} from "../lib/scoring";
import type { WineMedal } from "../lib/schema";

const DEFAULT_CONCURRENCY = 6;

interface WineRow {
  id: number;
  slug: string;
  name: string;
  vintage: number | null;
  valueScore: number | null;
  priceAvg: number | null;
  currentPrice: number | null;
  grapeVarieties: { name: string }[];
  medals: WineMedal[];
  descriptionEditorial: string | null;
  tastingNotes: string | null;
  tasteProfile: string | null;
  thingsYouShouldKnow: string[];
  sourceUrl: string | null;
  producerPageUrl: string | null;
  winery: { name: string } | null;
  region: { name: string } | null;
}

interface ProcessResult {
  wineId: number;
  slug: string;
  status: "updated" | "unchanged" | "skipped" | "failed";
  oldMedalsCount: number;
  newMedalsCount: number;
  oldScore: number | null;
  newScore: number | null;
  sourceFetched: boolean;
  error?: string;
}

function parseConcurrencyArg(): number {
  const match = process.argv.find((arg) => arg.startsWith("--concurrency="));
  if (!match) return DEFAULT_CONCURRENCY;
  const value = Number.parseInt(match.split("=")[1] ?? "", 10);
  if (!Number.isFinite(value) || value < 1) return DEFAULT_CONCURRENCY;
  return Math.min(8, value);
}

function parseLimitArg(): number | null {
  const match = process.argv.find((arg) => arg.startsWith("--limit="));
  if (!match) return null;
  const value = Number.parseInt(match.split("=")[1] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function medalsChanged(before: WineMedal[], after: WineMedal[]): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function averageScore(scores: (number | null)[]): number | null {
  const valid = scores.filter((score): score is number => score != null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((total, score) => total + score, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!, index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

async function processWine(
  wine: WineRow,
  dryRun: boolean,
  fetchSources: boolean,
): Promise<ProcessResult> {
  const oldMedalsCount = wine.medals.length;
  const oldScore = wine.valueScore;

  let sourcePageText: string | null = null;
  let sourceFetched = false;

  if (fetchSources) {
    const { combinedText, fetchedUrls } = await fetchMedalSourcePageText([
      wine.sourceUrl,
      wine.producerPageUrl,
    ]);
    if (combinedText.trim()) {
      sourcePageText = combinedText;
      sourceFetched = fetchedUrls.length > 0;
    }
  }

  const extractionInput = {
    name: wine.name,
    vintage: wine.vintage,
    wineryName: wine.winery?.name ?? null,
    descriptionEditorial: wine.descriptionEditorial,
    tastingNotes: wine.tastingNotes,
    tasteProfile: wine.tasteProfile,
    thingsYouShouldKnow: wine.thingsYouShouldKnow,
    sourceUrl: wine.sourceUrl,
    sourcePageText,
  };

  if (!hasMedalExtractionSourceText(extractionInput)) {
    return {
      wineId: wine.id,
      slug: wine.slug,
      status: "skipped",
      oldMedalsCount,
      newMedalsCount: oldMedalsCount,
      oldScore,
      newScore: oldScore,
      sourceFetched,
    };
  }

  try {
    const extractedMedals = await extractWineMedalsFromText(extractionInput);

    const newScore = calculateValueScore(
      valueScoreInputFromWine({
        priceAvg: wine.priceAvg,
        currentPrice: wine.currentPrice,
        grapeVarieties: wine.grapeVarieties,
        region: wine.region,
        medals: extractedMedals,
      }),
    );

    const medalsUpdated = medalsChanged(wine.medals, extractedMedals);
    const scoreUpdated = oldScore !== newScore;
    const changed = medalsUpdated || scoreUpdated;

    if (changed && !dryRun) {
      await db
        .update(wines)
        .set({
          medals: extractedMedals,
          valueScore: newScore,
        })
        .where(eq(wines.id, wine.id));
    }

    return {
      wineId: wine.id,
      slug: wine.slug,
      status: changed ? "updated" : "unchanged",
      oldMedalsCount,
      newMedalsCount: extractedMedals.length,
      oldScore,
      newScore,
      sourceFetched,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      wineId: wine.id,
      slug: wine.slug,
      status: "failed",
      oldMedalsCount,
      newMedalsCount: oldMedalsCount,
      oldScore,
      newScore: oldScore,
      sourceFetched,
      error: message,
    };
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const fetchSources = !process.argv.includes("--no-fetch");
  const concurrency = parseConcurrencyArg();
  const limit = parseLimitArg();

  let rows = await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      vintage: true,
      valueScore: true,
      priceAvg: true,
      currentPrice: true,
      grapeVarieties: true,
      medals: true,
      descriptionEditorial: true,
      tastingNotes: true,
      tasteProfile: true,
      thingsYouShouldKnow: true,
      sourceUrl: true,
      producerPageUrl: true,
    },
    with: {
      winery: { columns: { name: true } },
      region: { columns: { name: true } },
    },
    orderBy: [asc(wines.id)],
  });

  if (limit != null) {
    rows = rows.slice(0, limit);
  }

  console.log(
    `[reprocess-medals] ${rows.length} vinuri, concurrency=${concurrency}, fetchSources=${fetchSources}${dryRun ? ", dry-run" : ""}`,
  );

  const results = await mapWithConcurrency(
    rows as WineRow[],
    concurrency,
    async (wine, index) => {
      const result = await processWine(wine, dryRun, fetchSources);
      const prefix = `[reprocess-medals] [${index + 1}/${rows.length}] ${wine.slug}`;
      if (result.status === "updated") {
        console.log(
          `${prefix} medals ${result.oldMedalsCount}->${result.newMedalsCount}, score ${result.oldScore ?? "n/a"}->${result.newScore}${result.sourceFetched ? " [source]" : ""}`,
        );
      } else if (result.status === "failed") {
        console.error(`${prefix} failed: ${result.error}`);
      }
      return result;
    },
  );

  const updated = results.filter((result) => result.status === "updated");
  const unchanged = results.filter((result) => result.status === "unchanged");
  const skipped = results.filter((result) => result.status === "skipped");
  const failed = results.filter((result) => result.status === "failed");

  const receivedNewMedals = updated.filter(
    (result) => result.newMedalsCount > result.oldMedalsCount,
  );

  const withSourceFetch = results.filter((result) => result.sourceFetched);
  const withMedalsFound = results.filter((result) => result.newMedalsCount > 0);

  const oldScores = results.map((result) => result.oldScore);
  const newScores = results.map((result) => result.newScore ?? result.oldScore);
  const avgBefore = averageScore(oldScores);
  const avgAfter = averageScore(newScores);

  console.log("\n[reprocess-medals] Raport final");
  console.log(`  Total procesate:        ${results.length}`);
  console.log(`  Cu pagina sursa fetch:  ${withSourceFetch.length}`);
  console.log(`  Cu medalii extrase:     ${withMedalsFound.length}`);
  console.log(`  Actualizate:            ${updated.length}${dryRun ? " (simulat)" : ""}`);
  console.log(`  Neschimbate:            ${unchanged.length}`);
  console.log(`  Sarite (fara text):     ${skipped.length}`);
  console.log(`  Esuate:                 ${failed.length}`);
  console.log(`  Medalii noi (mai mult): ${receivedNewMedals.length}`);
  console.log(
    `  Medie Value Score:     ${avgBefore ?? "n/a"} -> ${avgAfter ?? "n/a"}`,
  );

  if (receivedNewMedals.length > 0) {
    console.log("\n[reprocess-medals] Vinuri cu medalii noi:");
    for (const result of receivedNewMedals.slice(0, 20)) {
      console.log(
        `  ${result.slug}: ${result.oldMedalsCount} -> ${result.newMedalsCount} medalii`,
      );
    }
  }

  console.log("\n[reprocess-medals] done");

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[reprocess-medals] fatal:", error);
  process.exit(1);
});
