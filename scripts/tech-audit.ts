/**
 * Read-only technical coverage audit.
 *
 *   npm run tech:audit
 */
import "../lib/load-env";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import { buildTechAuditReport } from "../lib/tech-facts/audit";
import { loadVerifiedTechWines } from "../lib/tech-facts/catalog";
import { recoverWineFromStored } from "../lib/tech-facts/recover";

async function main() {
  if (process.argv.includes("--apply")) {
    console.log("Refusing --apply. tech:audit is read-only.");
    process.exit(0);
  }
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("tech:audit dry-run. No writes.");
  const wines = await loadVerifiedTechWines();
  const recoveries = wines.map(recoverWineFromStored);
  const report = buildTechAuditReport(wines, recoveries);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
