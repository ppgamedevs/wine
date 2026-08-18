/**
 * Prompt 14 evidence-only backfill.
 *
 * Default is dry-run. --apply writes only wine_fact_evidence.
 */
import "../lib/load-env";
import { writeFile } from "node:fs/promises";
import {
  auditPersistedWineFactEvidence,
  runTechEvidenceBackfill,
} from "../lib/tech-facts/backfill";
import {
  captureProductionInvariantSnapshot,
  compareProductionInvariantSnapshots,
} from "../lib/tech-facts/production-snapshot";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(
    prefix.length,
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  const before = await captureProductionInvariantSnapshot();
  const backfill = await runTechEvidenceBackfill({
    apply,
    winerySlug: argValue("winery"),
    wineSlug: argValue("wine"),
  });
  const after = await captureProductionInvariantSnapshot();
  const invariants = compareProductionInvariantSnapshots(before, after);
  if (!invariants.identical) {
    throw new Error(
      `Forbidden production state changed: ${JSON.stringify(invariants)}`,
    );
  }
  const evidenceAudit = await auditPersistedWineFactEvidence();
  const report = {
    command: "tech:evidence-backfill",
    mode: getSecondaryScoringMode(),
    before,
    backfill,
    after,
    invariants,
    evidenceAudit,
    forbiddenWrites: {
      wineTechnical: 0,
      value: 0,
      gift: 0,
      food: 0,
      pairings: 0,
      editorial: 0,
      urlsSlugsStatuses: 0,
    },
  };
  const output = argValue("output");
  if (output) {
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
