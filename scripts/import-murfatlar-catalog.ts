import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { analyzeAndSaveWineFromUrl } from "@/lib/analyze-wine-service";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import {
  fetchMurfatlarCatalogItems,
  parseMurfatlarProductVariants,
} from "@/lib/murfatlar-producer";
import { findWineBySourceUrl } from "@/lib/wine-duplicate-detection";
import { db } from "@/lib/db";
import { regions, wines } from "@/lib/schema";

const DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.slice(8), 10) : undefined;
  const rangeArg = process.argv.find((arg) => arg.startsWith("--range="));
  const rangeSlug = rangeArg?.slice("--range=".length);

  const catalogItems = await fetchMurfatlarCatalogItems();
  const selectedRanges =
    rangeSlug != null
      ? catalogItems.filter((item) => item.slug === rangeSlug)
      : limit != null && Number.isFinite(limit)
        ? catalogItems.slice(0, limit)
        : catalogItems;

  const importJobs: Array<{ range: string; sourceUrl: string; name: string }> = [];

  for (const item of selectedRanges) {
    const page = await fetchPageWithResolution(item.url);
    const variants = parseMurfatlarProductVariants(page.html, page.finalUrl);
    for (const variant of variants) {
      importJobs.push({
        range: item.slug,
        sourceUrl: variant.sourceUrl,
        name: variant.name,
      });
    }
    await sleep(800);
  }

  console.log(
    `[import-murfatlar] ${importJobs.length} variante din ${selectedRanges.length} game`,
  );

  if (dryRun) {
    console.table(importJobs);
    return;
  }

  const results: Array<{
    sourceUrl: string;
    status: string;
    slug?: string;
    wineId?: number;
  }> = [];

  for (const job of importJobs) {
    console.log(`\n=== ${job.name} ===`);
    console.log(job.sourceUrl);

    const existing = await findWineBySourceUrl(job.sourceUrl);
    if (existing) {
      results.push({
        sourceUrl: job.sourceUrl,
        status: "existing",
        slug: existing.slug,
        wineId: existing.id,
      });
      console.log("existing", existing.slug);
      continue;
    }

    try {
      const result = await analyzeAndSaveWineFromUrl(job.sourceUrl, "admin-cli");
      results.push({
        sourceUrl: job.sourceUrl,
        status: result.status,
        slug: result.slug,
        wineId: result.wineId,
      });
      console.log(result.status, result.slug ?? result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ sourceUrl: job.sourceUrl, status: `error: ${message}` });
      console.error("FAILED", message);
    }

    await sleep(DELAY_MS);
  }

  const murfatlar = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  const createdIds = results
    .filter((item) => item.status === "created")
    .map((item) => item.wineId)
    .filter((id): id is number => id != null);

  if (murfatlar && createdIds.length > 0) {
    await db
      .update(wines)
      .set({ regionId: murfatlar.id })
      .where(inArray(wines.id, createdIds));
    console.log(`[import-murfatlar] region set Murfatlar for ${createdIds.length} wines`);
  }

  console.log("\n=== summary ===");
  console.table(results);
}

main().catch((error) => {
  console.error("[import-murfatlar] fatal:", error);
  process.exit(1);
});
