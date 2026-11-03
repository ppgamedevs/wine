import "../lib/load-env";
import { writeFileSync } from "node:fs";
import {
  loadTargetSources,
  loadTargetWine,
} from "@/lib/intelligence/fixtures";
import {
  loadCatalogWineForIntelligence,
  loadLiveSource,
} from "@/lib/intelligence/catalog-source";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import { serializeEvidenceReport } from "@/lib/intelligence/report";
import type { IntelligenceReport } from "@/lib/intelligence/types";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function summary(report: IntelligenceReport) {
  console.log(`# Wine Intelligence V2 — wine ${report.wineId} (${report.wineName})`);
  console.log("");
  console.log(`- Dry run: ${report.dryRun}`);
  console.log(`- Fingerprint: ${report.fingerprint}`);
  console.log(`- Sources: ${report.sources.length}`);
  console.log(`- Claims: ${report.claims.length}`);
  console.log(
    `- Conflicts preserved: ${report.reconciled.filter((item) => item.conflict).length}`,
  );
  console.log(`- Completeness: ${report.completeness.scorePercent}%`);
  console.log(`- Missing required fields: ${report.completeness.missingFields.join(", ") || "none"}`);
  console.log(
    "- AI: " +
      report.aiEstimate.requestCount +
      " request(s), ~" +
      report.aiEstimate.inputTokens +
      " input + " +
      report.aiEstimate.outputTokens +
      " output tokens, $" +
      report.aiEstimate.estimatedCostUsd.toFixed(6),
  );
  console.log(`- Source requests: ${report.requestCount}`);
  console.log("");
  console.log("| field | value | source | verification |");
  console.log("|---|---|---|---|");
  for (const claim of report.reconciled) {
    if (claim.value == null) continue;
    console.log(
      `| ${claim.field} | ${JSON.stringify(claim.value).slice(0, 90)} | ${claim.sourceClass ?? ""} | ${claim.verificationStatus} |`,
    );
  }
  if (report.errors.length > 0) {
    console.log("");
    console.log("## Actionable errors");
    for (const error of report.errors) console.log(`- ${error}`);
  }
}

async function main() {
  const wineArg = arg("wine") ?? "418";
  const wineId = Number.parseInt(wineArg, 10);
  if (!Number.isFinite(wineId)) {
    throw new Error(`Invalid --wine id: ${wineArg}`);
  }
  const apply = process.argv.includes("--apply");
  const fixturesOnly = process.argv.includes("--fixtures");
  const out = arg("out");

  if (apply && !process.argv.includes("--confirm-apply")) {
    throw new Error(
      "Refusing to apply without --confirm-apply. Run a dry-run first, review the report, then apply.",
    );
  }

  const fixtureInput = fixturesOnly
    ? {
        wine: loadTargetWine(),
        fixtures: loadTargetSources(),
        sourceCandidates: [],
        loadSource: undefined,
      }
    : null;
  const catalogInput = fixtureInput
    ? null
    : await loadCatalogWineForIntelligence(wineId);
  if (!fixtureInput && !catalogInput) {
    throw new Error(
      `Wine ${wineId} was not found in the configured catalog. Use --fixtures for the audited target fixture.`,
    );
  }

  const result = await runWineIntelligence({
    wine: fixtureInput?.wine ?? catalogInput!.input,
    fixtures: fixtureInput?.fixtures ?? [],
    sourceCandidates: fixtureInput?.sourceCandidates ?? catalogInput!.candidates,
    loadSource: fixtureInput?.loadSource ?? loadLiveSource,
    dryRun: !apply,
  });
  summary(result.report);

  if (out) {
    writeFileSync(
      out,
      JSON.stringify(serializeEvidenceReport(result.report), null, 2),
      "utf8",
    );
    console.log(`\nEvidence JSON written to ${out}`);
  }
  if (apply) {
    console.log("\nApplied:", result.persisted);
  }
}

main().catch((error) => {
  console.error("[wine-intelligence-v2]", error);
  process.exit(1);
});
