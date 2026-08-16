/**
 * Catalog cleanup workflow (Truth Layer).
 *
 *   npx tsx scripts/catalog-cleanup.ts
 *   npx tsx scripts/catalog-cleanup.ts --json
 *   npx tsx scripts/catalog-cleanup.ts --repair
 *
 * Default is dry-run / report only. --repair applies only deterministic
 * safe clears (never invents replacements, never deletes wines or slugs).
 */
import "../lib/load-env";
import { runCatalogCleanup } from "../lib/catalog-cleanup";

async function main() {
  const asJson = process.argv.includes("--json");
  const repair = process.argv.includes("--repair");
  const report = await runCatalogCleanup({ repair });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n[catalog-cleanup] dryRun=${report.dryRun}`);
  console.log(`[catalog-cleanup] verified=${report.totalVerified}`);
  console.log(`[catalog-cleanup] clean=${report.clean}`);
  console.log(`[catalog-cleanup] blocking=${report.blocking}`);
  console.log(`[catalog-cleanup] warnings=${report.warnings}`);

  console.log("\nProbleme pe severitate:");
  for (const [severity, count] of Object.entries(report.issuesBySeverity)) {
    console.log(`  ${severity}: ${count}`);
  }

  console.log("\nProbleme pe cod:");
  for (const [code, count] of Object.entries(report.issuesByCode).sort(
    (left, right) => right[1] - left[1],
  )) {
    console.log(`  ${code}: ${count}`);
  }

  console.log(
    `\nPlan deterministic: propozitii=${report.counts.sentencesRemovable} campuri=${report.counts.fieldsClearable} pairing=${report.counts.pairingNotesRemovable}`,
  );
  if (report.planned.length > 0) {
    console.log(`\nReparatii planificate (${report.planned.length}), primele 20:`);
    for (const item of report.planned.slice(0, 20)) {
      console.log(`  - ${item.slug}: ${item.actions.join("; ")}`);
    }
  }
  if (report.repaired.length > 0) {
    console.log(`\nReparatii aplicate (${report.repaired.length}):`);
    for (const item of report.repaired.slice(0, 30)) {
      console.log(`  - ${item.slug}: ${item.actions.join("; ")}`);
    }
  }

  console.log("\nCoada de revizuire (primele 20):");
  for (const item of report.reviewQueue.slice(0, 20)) {
    console.log(
      `  - ${item.slug} c=${item.critical} h=${item.high} m=${item.medium} l=${item.low} score=${item.valueScore ?? "-"}`,
    );
  }

  console.log("\n[catalog-cleanup] done");
}

main().catch((error) => {
  console.error("[catalog-cleanup] fatal:", error);
  process.exit(1);
});
