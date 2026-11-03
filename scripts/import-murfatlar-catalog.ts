import "../lib/load-env";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { ingestMurfatlarVariant } from "@/lib/murfatlar-ingest";
import {
  fetchMurfatlarCatalogItems,
  parseMurfatlarProductVariants,
  type MurfatlarWineVariant,
} from "@/lib/murfatlar-producer";

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

  const importJobs: Array<{
    range: string;
    variant: MurfatlarWineVariant;
  }> = [];

  for (const item of selectedRanges) {
    const page = await fetchPageWithResolution(item.url);
    const variants = parseMurfatlarProductVariants(page.html, page.finalUrl);
    for (const variant of variants) {
      importJobs.push({ range: item.slug, variant });
    }
    await sleep(800);
  }

  console.log(
    `[import-murfatlar] ${importJobs.length} variante din ${selectedRanges.length} game`,
  );

  if (dryRun) {
    console.table(
      importJobs.map(({ range, variant }) => ({
        range,
        key: variant.variantKey,
        name: variant.name,
        sweetness: variant.sweetness,
        grapes: variant.grapeVarieties.map((grape) => grape.name).join(" + "),
        volumeMl: variant.volumeMl,
        sourceUrl: variant.sourceUrl,
      })),
    );
    return;
  }

  const results: Array<{
    sourceUrl: string;
    canonicalKey: string;
    status: string;
    slug?: string;
    wineId?: number;
    message?: string;
  }> = [];

  for (const job of importJobs) {
    const { variant } = job;
    console.log(`\n=== ${variant.name} ===`);
    console.log(`key: ${variant.variantKey}`);
    console.log(variant.sourceUrl);

    try {
      const result = await ingestMurfatlarVariant({ variant });
      results.push({
        sourceUrl: variant.sourceUrl,
        canonicalKey: result.canonicalKey,
        status: result.status,
        slug: result.slug,
        wineId: result.wineId,
        message: result.message,
      });
      console.log(result.status, result.slug ?? result.message ?? "");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        sourceUrl: variant.sourceUrl,
        canonicalKey: variant.variantKey,
        status: `error: ${message}`,
      });
      console.error("FAILED", message);
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=== summary ===");
  console.table(results);
  const reviewCount = results.filter((item) =>
    item.status.startsWith("review_"),
  ).length;
  if (reviewCount > 0) {
    console.warn(
      `[import-murfatlar] ${reviewCount} variant(s) require manual reconciliation; nothing was merged.`,
    );
  }
}

main().catch((error) => {
  console.error("[import-murfatlar] fatal:", error);
  process.exit(1);
});
