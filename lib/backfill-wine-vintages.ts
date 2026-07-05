/**
 * Completeaza vintage lipsa din sourceUrl (eMAG / producator).
 *
 *   npx tsx lib/backfill-wine-vintages.ts
 *   npx tsx lib/backfill-wine-vintages.ts --dry-run
 */
import "./load-env";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./db";
import { extractProductFromUrl } from "./price-extractor";
import { wines } from "./schema";

const REQUEST_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const rows = await db.query.wines.findMany({
    where: and(eq(wines.status, "verified"), isNull(wines.vintage), isNotNull(wines.sourceUrl)),
    columns: { id: true, slug: true, name: true, sourceUrl: true },
    limit: 100,
  });

  console.log(`[backfill-vintages] ${rows.length} vinuri fara an${dryRun ? " (dry-run)" : ""}`);

  let updated = 0;
  let failed = 0;

  for (const [index, wine] of rows.entries()) {
    const prefix = `[backfill-vintages] [${index + 1}/${rows.length}] ${wine.slug}`;
    if (!wine.sourceUrl?.trim()) continue;

    try {
      const extracted = await extractProductFromUrl(wine.sourceUrl.trim(), {
        allowLlm: false,
      });

      if (extracted.vintage == null) {
        console.warn(`${prefix} vintage negasit`);
        continue;
      }

      console.log(`${prefix} -> ${extracted.vintage}`);

      if (!dryRun) {
        await db
          .update(wines)
          .set({ vintage: extracted.vintage })
          .where(eq(wines.id, wine.id));
      }

      updated += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${prefix} error: ${message}`);
    }

    if (index < rows.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`[backfill-vintages] done updated=${updated} failed=${failed}`);
}

main().catch((error) => {
  console.error("[backfill-vintages] fatal:", error);
  process.exit(1);
});
