import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { analyzeAndSaveWineFromUrl } from "../lib/analyze-wine-service";
import { findWineBySourceUrl } from "../lib/wine-duplicate-detection";
import { db } from "../lib/db";
import { regions, wines } from "../lib/schema";

const URLS = [
  "https://www.ballageza.com/ro/catalog/vinuri/tamaioasa-romaneasca,2023-kolna",
  "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2022-kolna",
  "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022-kolna",
  "https://www.ballageza.com/ro/catalog/vinuri/blaufrankisch,2020-kolna",
  "https://www.ballageza.com/ro/catalog/vinuri/merlot,2022-kolna",
  "https://www.ballageza.com/ro/catalog/vinuri/cabernet-franc,2020-kolna",
  "https://www.ballageza.com/ro/catalog/vinuri/cabernet-sauvignon,2021-kolna",
];

async function main() {
  const results: Array<{ url: string; status: string; slug?: string; wineId?: number }> = [];

  for (const url of URLS) {
    console.log("\n=== import", url, "===");
    const existing = await findWineBySourceUrl(url);
    if (existing) {
      results.push({
        url,
        status: "existing",
        slug: existing.slug,
        wineId: existing.id,
      });
      console.log("existing", existing.slug);
      continue;
    }

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

  const ids = results
    .filter((item) => item.status === "created")
    .map((item) => item.wineId)
    .filter((id): id is number => id != null);

  if (minis && ids.length > 0) {
    await db
      .update(wines)
      .set({ regionId: minis.id, tastingSheetUrl: null })
      .where(inArray(wines.id, ids));
  }

  console.log("\n=== summary ===");
  console.table(results);
}

main().catch(console.error);
