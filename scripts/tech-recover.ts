/**
 * Read-only technical recovery dry-run. Prompt 13.
 *
 *   npm run tech:recover
 *   npm run tech:recover -- --winery=balla-geza
 *   npm run tech:recover -- --wine=<slug>
 *   npm run tech:recover -- --no-fetch
 */
import "../lib/load-env";
import { refuseApply, runReadOnlyCatalogRecovery, buildPrompt13Report } from "../lib/tech-facts/run-recovery";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  if (refuseApply("tech:recover")) process.exit(0);
  const { wines, recoveries, fetched } = await runReadOnlyCatalogRecovery({
    winerySlug: argValue("winery"),
    wineSlug: argValue("wine"),
    noFetch: process.argv.includes("--no-fetch"),
  });
  const report = buildPrompt13Report(wines, recoveries, fetched.stats);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
