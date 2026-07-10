/**
 * Recalculeaza VinIntel Value Score pentru toate vinurile.
 *
 *   npx tsx scripts/recalculate-all-scores.ts
 *   npx tsx scripts/recalculate-all-scores.ts --dry-run
 */
import "../lib/load-env";
import { recalculateAllValueScores } from "../lib/recalculate-value-scores";
import { VALUE_SCORE_ALGORITHM_VERSION } from "../lib/scoring";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(
    `[recalculate-scores] Value Score v${VALUE_SCORE_ALGORITHM_VERSION}${dryRun ? " (dry-run)" : ""}`,
  );

  await recalculateAllValueScores({ dryRun });
  console.log("\n[recalculate-scores] done");
}

main().catch((error) => {
  console.error("[recalculate-scores] fatal:", error);
  process.exit(1);
});
