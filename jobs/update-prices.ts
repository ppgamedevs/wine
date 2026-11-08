/**
 * Actualizeaza preturile afiliate verificabile, in batch-uri resumabile.
 *
 * Rulare manuala:
 *   npm run jobs:update-prices
 *   npm run jobs:update-prices -- --dry-run
 *   npm run jobs:update-prices -- --limit=20
 */
import "../lib/load-env";
import { randomUUID } from "node:crypto";
import {
  DbPriceRefreshStore,
  dbPriceRefreshFetcher,
} from "../lib/price-refresh-store";
import { runPriceRefreshBatch } from "../lib/price-refresh";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 40;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const parsed = limitArg
    ? Number(limitArg.slice("--limit=".length))
    : DEFAULT_LIMIT;
  return {
    dryRun: args.includes("--dry-run"),
    limit:
      Number.isInteger(parsed) && parsed > 0
        ? Math.min(parsed, MAX_LIMIT)
        : DEFAULT_LIMIT,
  };
}

async function main() {
  const options = parseArgs();
  const result = await runPriceRefreshBatch({
    store: new DbPriceRefreshStore(),
    fetcher: dbPriceRefreshFetcher,
    lockToken: `cli:${randomUUID()}`,
    limit: options.limit,
    dryRun: options.dryRun,
    requestDelayMs: 1_200,
  });
  console.log(JSON.stringify({ ...result, dryRun: options.dryRun }, null, 2));
  if (result.status === "locked") {
    console.error("[update-prices] alt job rulează deja.");
    process.exitCode = 2;
    return;
  }
  if (result.status === "failed") process.exitCode = 1;
}

main().catch((error) => {
  console.error("[update-prices] fatal:", error);
  process.exit(1);
});
