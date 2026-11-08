import "../lib/load-env";
import { db } from "../lib/db";
import { evaluateSources, type PriceAuditWine } from "../lib/affiliate-pricing";
import { resolvePublicPrice } from "../lib/public-price";

interface AuditOptions {
  json: boolean;
  perWine: boolean;
  limit: number;
}

function parseArgs(): AuditOptions {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const parsed = limitArg ? Number(limitArg.slice("--limit=".length)) : 50;
  return {
    json: args.includes("--json"),
    perWine: args.includes("--per-wine"),
    limit: Number.isInteger(parsed) && parsed > 0 ? parsed : 50,
  };
}

async function main() {
  const options = parseArgs();
  const rows = await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      status: true,
      sourceUrl: true,
      producerPageUrl: true,
      currentPrice: true,
      priceAvg: true,
      priceHistory: true,
      affiliateLinks: true,
      vintage: true,
    },
  });

  const report = rows.map((row) =>
    evaluateSources({
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      sourceUrl: row.sourceUrl,
      producerPageUrl: row.producerPageUrl,
      currentPrice: row.currentPrice,
      priceAvg: row.priceAvg,
      priceHistory: row.priceHistory ?? [],
      affiliateLinks: row.affiliateLinks ?? [],
    } satisfies PriceAuditWine),
  );

  const count = (predicate: (row: (typeof report)[number]) => boolean) =>
    report.filter(predicate).length;
  const summary = {
    wines: report.length,
    verified: count((row) => row.status === "verified"),
    producerUrls: count((row) => Boolean(row.producerUrl)),
    emagUrls: count((row) => Boolean(row.emagUrl)),
    profitshareUrls: count((row) => Boolean(row.profitshareUrl)),
    exactProductIds: count((row) => Boolean(row.merchantProductId)),
    storedPrices: count((row) => row.storedPrice != null),
    missingPriceObservations: count((row) => row.missingPriceObservation),
    legacyUrlSwaps: count((row) => row.legacyUrlSwap),
    staleObservations: count((row) => row.cases.includes("stale_observation")),
    recoverable: count((row) => row.recoverable),
    needsManualCorrection: count((row) => row.manualCorrection),
    unavailable: count((row) => row.unavailable),
    publicPriceCoverage: rows.filter(
      (row) =>
        resolvePublicPrice({
          slug: row.slug,
          name: row.name,
          vintage: row.vintage ?? null,
          affiliateLinks: row.affiliateLinks ?? [],
          priceHistory: row.priceHistory ?? [],
        }).displayPrice != null,
    ).length,
    cases: report.reduce<Record<string, number>>((acc, row) => {
      for (const code of row.cases) acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    }, {}),
  };

  if (options.json) {
    console.log(JSON.stringify({ summary, report }, null, 2));
    return;
  }

  console.log("[affiliate-audit]", JSON.stringify(summary, null, 2));
  if (options.perWine) {
    for (const row of report.slice(0, options.limit)) {
      console.log(
        [
          row.id,
          row.slug,
          row.cases.join(","),
          row.producerUrl ? "producer" : "-",
          row.emagUrl ? row.merchantProductId : "-",
          row.profitshareUrl ? "affiliate" : "-",
          row.storedPrice ?? "-",
        ].join("\t"),
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
