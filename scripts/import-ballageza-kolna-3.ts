import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { analyzeAndSaveWineFromUrl } from "../lib/analyze-wine-service";
import { db } from "../lib/db";
import { regions, wines } from "../lib/schema";

const URLS = [
  "https://www.ballageza.com/ro/catalog/vinuri/sauvignon-blanc-feteasca-regala,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/sauvignon-blanc,2024",
  "https://www.ballageza.com/ro/catalog/vinuri/riesling-de-rhin,2023",
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

  const ids = results.map((item) => item.wineId).filter((id): id is number => id != null);

  if (minis && ids.length > 0) {
    await db
      .update(wines)
      .set({ regionId: minis.id, tastingSheetUrl: null })
      .where(inArray(wines.id, ids));

    for (const id of ids) {
      const wine = await db.query.wines.findFirst({
        where: eq(wines.id, id),
        columns: { id: true, name: true },
      });
      if (!wine?.name.includes("&amp;")) continue;
      await db
        .update(wines)
        .set({ name: wine.name.replace(/&amp;/g, "&") })
        .where(eq(wines.id, id));
    }
  }

  console.log("\n=== summary ===");
  console.table(results);
}

main().catch(console.error);
