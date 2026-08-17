/**
 * Read-only provenance audit of curated producer_evidence pairings.
 * Default DRY RUN. --apply is refused.
 *
 *   npm run pairing:provenance-audit
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { auditWineProvenance } from "../lib/pairing/provenance-audit";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "../types";

async function main() {
  if (process.argv.includes("--apply")) {
    console.log("Refusing --apply. Provenance repair is dry-run only in this task.");
    process.exit(0);
  }
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("pairing:provenance-audit dry-run. No writes.");
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]).filter(
    (wine) => wine.foodPairings.length > 0,
  );
  const rowsOut = catalog.flatMap((wine) => auditWineProvenance(wine));
  const mismatches = rowsOut.filter((row) => row.proposedBasis);
  console.log(
    JSON.stringify(
      {
        producerEvidencePairings: rowsOut.length,
        mismatches: mismatches.length,
        rows: rowsOut,
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
