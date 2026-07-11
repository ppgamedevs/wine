import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { analyzeAndSaveWineFromUrl } from "@/lib/analyze-wine-service";
import {
  fetchBudureascaCatalogItems,
  shouldSkipBudureascaCatalogItem,
} from "@/lib/budureasca-producer";
import { findWineBySourceUrl } from "@/lib/wine-duplicate-detection";
import { db } from "@/lib/db";
import { regions, wines } from "@/lib/schema";

const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.slice(8), 10) : undefined;

  const catalogItems = await fetchBudureascaCatalogItems({ maxPages: 20 });
  const items = catalogItems.filter(
    (item) => !shouldSkipBudureascaCatalogItem(item.name, item.url),
  );
  const selected = limit != null && Number.isFinite(limit) ? items.slice(0, limit) : items;

  console.log(`[import-budureasca] ${selected.length}/${items.length} produse de importat`);
  if (dryRun) {
    console.table(selected.map((item) => ({ name: item.name, url: item.url, price: item.price })));
    return;
  }

  const results: Array<{
    url: string;
    status: string;
    slug?: string;
    wineId?: number;
    message?: string;
  }> = [];

  for (const item of selected) {
    console.log(`\n=== import ${item.name} ===`);
    console.log(item.url);

    const existing = await findWineBySourceUrl(item.url);
    if (existing) {
      results.push({
        url: item.url,
        status: "existing",
        slug: existing.slug,
        wineId: existing.id,
      });
      console.log("existing", existing.slug);
      continue;
    }

    try {
      const result = await analyzeAndSaveWineFromUrl(item.url, "admin-cli");
      results.push({
        url: item.url,
        status: result.status,
        slug: result.slug,
        wineId: result.wineId,
        message: result.message,
      });
      console.log(result.status, result.slug ?? result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ url: item.url, status: `error: ${message}`, message });
      console.error("FAILED", message);
    }

    await sleep(DELAY_MS);
  }

  const dealuMare = await db.query.regions.findFirst({
    where: eq(regions.slug, "dealu-mare"),
    columns: { id: true },
  });

  const createdIds = results
    .filter((item) => item.status === "created")
    .map((item) => item.wineId)
    .filter((id): id is number => id != null);

  if (dealuMare && createdIds.length > 0) {
    await db
      .update(wines)
      .set({ regionId: dealuMare.id })
      .where(inArray(wines.id, createdIds));
    console.log(`[import-budureasca] region set Dealu Mare for ${createdIds.length} wines`);
  }

  console.log("\n=== summary ===");
  console.table(results);
}

main().catch((error) => {
  console.error("[import-budureasca] fatal:", error);
  process.exit(1);
});
