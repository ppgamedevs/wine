import "../lib/load-env";
import { writeFileSync } from "node:fs";
import { loadQualityWinesFromDb } from "@/lib/quality/from-db";
import { runCatalogQualityAudit } from "@/lib/quality/engine";
import type { CatalogQualityReport, QualityAssessment } from "@/lib/quality/types";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function isRecoverable(assessment: QualityAssessment, field: string): boolean {
  const notes = `${assessment.wine.tastingNotes ?? ""} ${assessment.wine.descriptionEditorial ?? ""}`;
  if (field === "serving_temperature") {
    return /temperatura\s+(?:de\s+)?servire/i.test(notes);
  }
  if (field === "food_pairing") {
    return /asocierea culinar/i.test(notes);
  }
  if (field === "tasting_notes") {
    return /culoare|miros|gust/i.test(notes);
  }
  return false;
}

function sampleWines(wines: Awaited<ReturnType<typeof loadQualityWinesFromDb>>, limit: number) {
  const selected = new Map<number, (typeof wines)[number]>();
  const add = (wine: (typeof wines)[number] | undefined) => {
    if (wine && selected.size < limit) selected.set(wine.id, wine);
  };

  add(wines.find((wine) => wine.id === 418));
  // Multiple producer variants / known collision families.
  for (const wine of wines.filter((wine) => /zestrea|statornic|sable noble/i.test(wine.name))) {
    add(wine);
  }
  // Variety/type/sweetness coverage.
  for (const type of ["white", "red", "rose", "sparkling"]) {
    add(wines.find((wine) => wine.type === type));
  }
  for (const sweetness of ["demisec", "demidulce", "sec", "dulce"]) {
    add(wines.find((wine) => wine.sweetness === sweetness));
  }
  // Pricing and vintage coverage.
  add(wines.find((wine) => (wine.priceAvg ?? 0) > 0));
  add(wines.find((wine) => (wine.priceAvg ?? 0) <= 0));
  add(wines.find((wine) => wine.vintage != null));
  add(wines.find((wine) => wine.vintage == null));
  // Multi-source / conflicting-evidence candidates.
  add(wines.find((wine) => wine.affiliateLinks.length > 1));
  add(wines.find((wine) => (wine.sourceUrl ?? "").length > 0));

  for (const wine of wines) {
    if (selected.size >= limit) break;
    add(wine);
  }
  return [...selected.values()];
}

function beforeAfter(report: CatalogQualityReport) {
  const rows: Array<{ field: string; before: number; after: number; total: number }> = [];
  for (const field of [
    "tasting_notes",
    "serving_temperature",
    "food_pairing",
    "alcohol",
    "source_url",
  ]) {
    let before = 0;
    let after = 0;
    for (const assessment of report.assessments) {
      const category = assessment.categories.find((item) =>
        item.presentFields.includes(field) || item.missing.includes(field),
      );
      const present = category?.presentFields.includes(field) ?? false;
      if (present) before += 1;
      if (present || isRecoverable(assessment, field)) after += 1;
    }
    rows.push({ field, before, after, total: report.assessments.length });
  }
  return rows;
}

function markdown(report: CatalogQualityReport, title: string): string {
  const s = report.summary;
  const lines = [
    `# ${title}`,
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total wines: ${s.totalWines}`,
    `- Complete: ${s.complete}`,
    `- Partial: ${s.partial}`,
    `- Incomplete: ${s.incomplete}`,
    `- Factual completeness average: ${s.factualCompletenessAverage}%`,
    `- Verified technical coverage: ${s.verifiedTechnicalCoverage}%`,
    `- Sensory evidence coverage: ${s.sensoryEvidenceCoverage}%`,
    `- Identity conflicts: ${s.identityConflicts}`,
    `- Potential duplicate groups: ${s.potentialDuplicates}`,
    `- Missing producer sources: ${s.missingProducerSources}`,
    `- Qualifying affiliate price coverage: ${s.affiliatePriceCoverage}`,
    `- No affiliate price (separate from quality): ${s.noAffiliatePrice}`,
    `- Critical gates: ${s.criticalGates}`,
    `- Retry queue: ${s.retryQueue}`,
    `- Recently improved: ${s.recentlyImproved}`,
    "",
    "## Gate counts",
    "",
    "| Gate | Count |",
    "|---|---:|",
    ...Object.entries(report.gateCounts)
      .sort((left, right) => right[1] - left[1])
      .map(([gate, count]) => `| ${gate} | ${count} |`),
    "",
    "## Deterministic dry-run field coverage (before → after structuring existing evidence)",
    "",
    "| Field | Before | After | Total |",
    "|---|---:|---:|---:|",
    ...beforeAfter(report).map(
      (row) => `| ${row.field} | ${row.before} | ${row.after} | ${row.total} |`,
    ),
    "",
    "## Representative coverage",
    "",
    `- Types: ${["white", "red", "rose", "sparkling"]
      .map(
        (type) =>
          `${type} ${report.assessments.filter((item) => item.wine.type === type).length}`,
      )
      .join(", ")}`,
    `- Vintage present / non-vintage: ${report.assessments.filter((item) => item.wine.vintage != null).length} / ${report.assessments.filter((item) => item.wine.vintage == null).length}`,
    `- Stored price present: ${report.assessments.filter((item) => (item.wine.priceAvg ?? 0) > 0).length}`,
    `- Multiple stored links: ${report.assessments.filter((item) => item.wine.affiliateLinks.length > 1).length}`,
    `- Target wine included: ${report.assessments.some((item) => item.wine.id === 418) ? "yes" : "no"}`,
    "",
    "## Sample records",
    "",
    "| ID | Wine | Status | Factual | Gates |",
    "|---:|---|---|---:|---|",
    ...report.assessments
      .slice(0, 50)
      .map(
        (assessment) =>
          `| ${assessment.wine.id} | ${assessment.wine.name} | ${assessment.status} | ${assessment.factualScore}% | ${assessment.gates.map((gate) => gate.code).join(", ") || "—"} |`,
      ),
    "",
    "## Prioritized repair queue",
    "",
    "| Priority | Wine | Action |",
    "|---|---|---|",
    ...report.retryQueue
      .slice(0, 20)
      .map((item) => `| ${item.priority} | ${item.slug} | ${item.action} |`),
    "",
    "No database writes were performed.",
  ];
  return lines.join("\n");
}

async function main() {
  const all = process.argv.includes("--all");
  const limit = Number.parseInt(arg("sample") ?? "50", 10);
  const out = arg("out");
  const jsonOut = arg("json");
  const wines = await loadQualityWinesFromDb();
  const selected = all ? wines : sampleWines(wines, limit);
  const started = performance.now();
  const report = runCatalogQualityAudit(selected);
  const elapsed = Math.round(performance.now() - started);
  const title = all
    ? "Wine Catalog Quality Engine — production-wide read-only report"
    : `Wine Catalog Quality Engine — ${selected.length}-wine sample audit`;
  const md = markdown(report, title);
  console.log(md);
  console.log(`\nPerformance: ${selected.length} wines assessed in ${elapsed} ms.`);
  if (out) writeFileSync(out, md, "utf8");
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
