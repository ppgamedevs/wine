/**
 * Actualizeaza preturile vinurilor verificate cu sourceUrl.
 *
 * Rulare manuala:
 *   npm run jobs:update-prices
 *   npm run jobs:update-prices -- --dry-run
 *   npm run jobs:update-prices -- --limit=20
 */
import "../lib/load-env";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { extractProductFromUrl, inferImageSourceFromUrl } from "../lib/price-extractor";
import { updatePrice } from "../lib/price-tracker";
import { wines } from "../lib/schema";

/** Implicit: 40 vinuri per rulare (interval recomandat 30-50). */
const DEFAULT_RUN_LIMIT = 40;
const MAX_RUN_LIMIT = 50;
const REQUEST_DELAY_MS = 1200;

interface JobOptions {
  dryRun: boolean;
  skipLlm: boolean;
  limit: number;
}

interface WineTarget {
  id: number;
  slug: string;
  name: string;
  sourceUrl: string;
  currentPrice: number | null;
  imageUrl: string | null;
}

function parseArgs(): JobOptions {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const parsedLimit = limitArg
    ? Number(limitArg.slice("--limit=".length))
    : DEFAULT_RUN_LIMIT;

  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_RUN_LIMIT)
      : DEFAULT_RUN_LIMIT;

  return {
    dryRun: args.includes("--dry-run"),
    skipLlm: args.includes("--skip-llm"),
    limit,
  };
}

async function loadTargets(limit: number): Promise<WineTarget[]> {
  const rows = await db.query.wines.findMany({
    where: and(eq(wines.status, "verified"), isNotNull(wines.sourceUrl)),
    columns: {
      id: true,
      slug: true,
      name: true,
      sourceUrl: true,
      currentPrice: true,
      imageUrl: true,
      updatedAt: true,
    },
    orderBy: [
      sql`CASE WHEN ${wines.currentPrice} IS NULL THEN 0 ELSE 1 END`,
      asc(wines.updatedAt),
      asc(wines.slug),
    ],
    limit: limit * 3,
  });

  return rows
    .filter((row): row is typeof row & { sourceUrl: string } =>
      Boolean(row.sourceUrl?.trim()),
    )
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      sourceUrl: row.sourceUrl.trim(),
      currentPrice: row.currentPrice,
      imageUrl: row.imageUrl,
    }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function priceChanged(
  currentPrice: number | null,
  newPrice: number,
): boolean {
  return currentPrice == null || currentPrice !== newPrice;
}

async function main() {
  const options = parseArgs();
  const targets = await loadTargets(options.limit);

  console.log(
    `[update-prices] batch=${targets.length}/${options.limit} max` +
      (options.dryRun ? " dry-run" : "") +
      (options.skipLlm ? " skip-llm" : ""),
  );

  if (targets.length === 0) {
    console.log("[update-prices] niciun vin verified cu sourceUrl.");
    return;
  }

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, wine] of targets.entries()) {
    const prefix = `[update-prices] [${index + 1}/${targets.length}] ${wine.slug}`;

    try {
      console.log(`${prefix} fetch ${wine.sourceUrl}`);

      const extracted = await extractProductFromUrl(wine.sourceUrl, {
        allowLlm: !options.skipLlm,
      });

      if (extracted.price == null) {
        skipped += 1;
        console.warn(`${prefix} skip: pret negasit`);
        continue;
      }

      if (!priceChanged(wine.currentPrice, extracted.price)) {
        unchanged += 1;
        console.log(`${prefix} skip: pret neschimbat (${extracted.price} RON)`);
      } else {
        const previous =
          wine.currentPrice != null ? `${wine.currentPrice} RON` : "nesetat";
        console.log(`${prefix} update ${previous} -> ${extracted.price} RON`);

        if (!options.dryRun) {
          await updatePrice(wine.id, extracted.price, extracted.finalUrl);
        }

        updated += 1;
      }

      if (
        extracted.imageUrl &&
        !wine.imageUrl &&
        !options.dryRun
      ) {
        await db
          .update(wines)
          .set({
            imageUrl: extracted.imageUrl,
            imageSource: inferImageSourceFromUrl(extracted.finalUrl),
          })
          .where(eq(wines.id, wine.id));
        console.log(`${prefix} imagine adaugata`);
      } else if (extracted.imageUrl && !wine.imageUrl) {
        console.log(`${prefix} imagine gasita (dry-run)`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${prefix} error: ${message}`);
    }

    if (index < targets.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(
    `[update-prices] done updated=${updated} unchanged=${unchanged} skipped=${skipped} failed=${failed}`,
  );
}

main().catch((error) => {
  console.error("[update-prices] fatal:", error);
  process.exit(1);
});
