import "../lib/load-env";
import { eq } from "drizzle-orm";
import { analyzeAndSaveWineFromUrl } from "../lib/analyze-wine-service";
import { db } from "../lib/db";
import { regions, wines } from "../lib/schema";

const URLS = [
  "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022",
  "https://www.ballageza.com/ro/catalog/vinuri/blaufrankisch,2021",
  "https://www.ballageza.com/ro/catalog/vinuri/pinot-noir,2022",
  "https://www.ballageza.com/ro/catalog/vinuri/merlot,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/cabernet-sauvignon,2021",
];

async function main() {
  const results: Array<{ url: string; status: string; slug?: string; wineId?: number }> = [];

  for (const url of URLS) {
    console.log("\n=== import", url, "===");
    try {
      const result = await analyzeAndSaveWineFromUrl(url, "admin-cli");
      results.push({
        url,
        status: result.status,
        slug: result.slug,
        wineId: result.wineId,
      });
      console.log(result.status, result.slug ?? result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ url, status: `error: ${message}` });
      console.error("FAILED", message);
    }
  }

  const minis = await db.query.regions.findFirst({
    where: eq(regions.slug, "minis"),
    columns: { id: true },
  });

  if (minis) {
    for (const item of results) {
      if (!item.wineId) continue;
      await db
        .update(wines)
        .set({ regionId: minis.id, tastingSheetUrl: null })
        .where(eq(wines.id, item.wineId));
    }
  }

  console.log("\n=== summary ===");
  console.table(results);
}

main().catch(console.error);
