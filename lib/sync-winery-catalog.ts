/**
 * Sync winery logos, taglines, and verification flags from lib/winery-catalog.ts.
 *
 *   npx tsx lib/sync-winery-catalog.ts
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { WINERY_CATALOG } from "./winery-catalog";
import { wineries } from "./schema";

async function logoUrlWorks(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (response.ok) return true;
    const getResponse = await fetch(url, { redirect: "follow" });
    return getResponse.ok;
  } catch {
    return false;
  }
}

async function main() {
  const rows = await db.query.wineries.findMany({
    columns: { id: true, slug: true, name: true },
  });

  let updated = 0;

  for (const row of rows) {
    const enrichment = WINERY_CATALOG[row.slug];
    const patch: Record<string, unknown> = {
      verified: false,
      updatedAt: new Date().toISOString(),
    };

    if (enrichment?.tagline) {
      patch.description = enrichment.tagline;
    }

    if (enrichment?.logoUrl) {
      const ok = await logoUrlWorks(enrichment.logoUrl);
      if (ok) {
        patch.logoUrl = enrichment.logoUrl;
      } else {
        console.warn(`[sync-winery] logo invalid for ${row.slug}: ${enrichment.logoUrl}`);
      }
    }

    await db.update(wineries).set(patch).where(eq(wineries.id, row.id));
    updated += 1;
    console.log(`[sync-winery] ${row.slug}`);
  }

  console.log(`[sync-winery] done ${updated}/${rows.length}`);
}

main().catch((error) => {
  console.error("[sync-winery] fatal:", error);
  process.exit(1);
});
