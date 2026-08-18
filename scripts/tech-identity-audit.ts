/**
 * Read-only source identity audit. Never writes.
 *
 *   npm run tech:identity-audit
 *   npm run tech:identity-audit -- --winery=balla-geza
 */
import "../lib/load-env";
import { refuseApply, runReadOnlyCatalogRecovery } from "../lib/tech-facts/run-recovery";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  if (refuseApply("tech:identity-audit")) process.exit(0);
  const { wines, recoveries, fetched } = await runReadOnlyCatalogRecovery({
    winerySlug: argValue("winery"),
    wineSlug: argValue("wine"),
    noFetch: process.argv.includes("--no-fetch"),
  });
  const rows = recoveries.map((recovery) => {
    const wine = wines.find((item) => item.id === recovery.wineId);
    return {
      slug: recovery.slug,
      winery: recovery.winerySlug,
      dbName: wine?.name ?? null,
      dbVintage: wine?.vintage ?? null,
      sourceWineName: recovery.sourceIdentity?.sourceWineName ?? null,
      sourceVintage: recovery.sourceIdentity?.sourceVintage ?? null,
      identityMatch: recovery.sourceIdentity?.match ?? recovery.ballaStatus ?? "SOURCE_NAME_MISSING",
      ballaStatus: recovery.ballaStatus ?? null,
      inheritedDbName:
        recovery.sourceIdentity?.sourceWineName != null &&
        wine?.name != null &&
        recovery.sourceIdentity.sourceWineName === wine.name &&
        !recovery.claims.some((claim) => claim.sourceWineName && claim.sourceWineName !== wine.name),
    };
  });
  const missing = rows.filter((row) => !row.sourceWineName).length;
  const exact = rows.filter((row) => row.identityMatch === "EXACT_WINE_EXACT_VINTAGE" || row.identityMatch === "EXACT_MATCH").length;
  console.log(
    JSON.stringify(
      {
        fetch: fetched.stats,
        wines: rows.length,
        sourceNameMissing: missing,
        exactIdentity: exact,
        inheritedDbNameSuspect: rows.filter((row) => row.inheritedDbName && !row.sourceWineName).length,
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
