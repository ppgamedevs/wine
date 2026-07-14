/**
 * Scan de integritate a datelor pentru tot catalogul VinIntel.
 *
 *   npx tsx scripts/integrity-scan.ts
 *   npx tsx scripts/integrity-scan.ts --json
 *
 * Gandit pentru rulare locala, in CI si din pagina admin de data-quality
 * (`lib/integrity-scan.ts` expune aceeasi logica pura, testata unitar in
 * `lib/integrity-scan.test.ts`).
 */
import "../lib/load-env";
import { runIntegrityScan } from "../lib/integrity-scan";

const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;

async function main() {
  const asJson = process.argv.includes("--json");
  const report = await runIntegrityScan();

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n[integrity-scan] generat la ${report.generatedAt}`);
  console.log(
    `[integrity-scan] total vinuri: ${report.summary.totalWines}, publicate: ${report.summary.publishedWines}`,
  );
  console.log(
    `[integrity-scan] grupuri de duplicate candidate: ${report.summary.duplicateGroupCount}`,
  );

  console.log("\nProbleme pe severitate:");
  for (const severity of SEVERITY_ORDER) {
    console.log(`  ${severity}: ${report.summary.issuesBySeverity[severity]}`);
  }

  console.log("\nProbleme pe tip:");
  for (const [code, count] of Object.entries(report.summary.issuesByCode).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${code}: ${count}`);
  }

  const critical = report.issues.filter((i) => i.severity === "critical");
  if (critical.length > 0) {
    console.log("\nProbleme CRITICE (necesita atentie imediata):");
    for (const issue of critical) {
      console.log(`  - [${issue.slug}] ${issue.message}`);
    }
  }

  const high = report.issues.filter((i) => i.severity === "high");
  if (high.length > 0) {
    console.log(`\nProbleme HIGH (${high.length}), primele 20:`);
    for (const issue of high.slice(0, 20)) {
      console.log(`  - [${issue.slug}] ${issue.message}`);
    }
  }

  if (report.duplicateGroups.length > 0) {
    console.log(
      `\nDuplicate candidate (${report.duplicateGroups.length}), primele 20:`,
    );
    for (const group of report.duplicateGroups.slice(0, 20)) {
      console.log(`  - ${group.slugs.join(" <-> ")} (${group.reason})`);
    }
  }

  console.log("\n[integrity-scan] done");
}

main().catch((error) => {
  console.error("[integrity-scan] fatal:", error);
  process.exit(1);
});
