/**
 * Read-only Prompt 15 public technical-trust benchmark.
 */
import "../lib/load-env";
import { runPublicTechnicalTrustAudit } from "../lib/tech-facts/public-trust-query";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";

async function main() {
  const audit = await runPublicTechnicalTrustAudit();
  console.log(
    JSON.stringify(
      {
        command: "tech:public-audit",
        readOnly: true,
        secondaryScoringMode: getSecondaryScoringMode(),
        ...audit,
      },
      null,
      2,
    ),
  );
  if (audit.conflicts.length > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
