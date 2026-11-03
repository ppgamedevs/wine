import "../lib/load-env";
import { readFileSync, writeFileSync } from "node:fs";
import { loadTargetSources, loadTargetWine } from "@/lib/intelligence/fixtures";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import {
  BENCHMARK_QUESTIONS,
  buildFixtureBaselineAnswerSet,
  evaluateBenchmark,
  validateAnswerSet,
  type BenchmarkAnswer,
  type BenchmarkAnswerSet,
} from "@/lib/quality/benchmark";

function strings(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  return value == null ? "" : String(value);
}

function vinintelAnswerSet(report: Awaited<ReturnType<typeof runWineIntelligence>>["report"]): BenchmarkAnswerSet {
  const values = new Map(
    report.reconciled
      .filter((claim) => claim.value != null)
      .map((claim) => [claim.field, claim.value]),
  );
  const citations = [
    ...new Set(
      report.reconciled
        .filter((claim) => claim.value != null)
        .map((claim) => claim.sourceUrl ?? "")
        .filter(Boolean),
    ),
  ];
  const sourceText = (fields: string[]) =>
    fields
      .filter((field) => values.has(field as never))
      .map((field) => `${field}: ${strings(values.get(field as never))}`)
      .join("; ");
  const answer = (text: string, supportedFields: string[]): BenchmarkAnswer => ({
    text: text.trim() || "No structured evidence available.",
    citations,
    supportedFields,
    unsupportedAssertions: [],
  });

  return {
    label: "VinIntel V2 source-backed answers",
    provenance: {
      kind: "vinintel",
      generatedAt: new Date().toISOString(),
      notes: "Generated deterministically from the V2 report and its source URLs; no AI answer generation.",
    },
    answers: {
      style: answer(
        `Wine type: ${strings(values.get("wine_color") ?? "not stated")}; sweetness: ${strings(values.get("sweetness") ?? "not stated")}.`,
        ["wine_color", "sweetness", "type"].filter((field) =>
          field === "type" ? values.has("wine_color") : values.has(field as never),
        ),
      ),
      grape: answer(
        sourceText(["grape_varieties"]) || "No structured grape claim.",
        values.has("grape_varieties") ? ["grape_varieties"] : [],
      ),
      taste: answer(
        sourceText(["taste_descriptors", "aroma_descriptors"]) || "No structured sensory claim.",
        ["taste_descriptors", "aroma_descriptors"].filter((field) =>
          values.has(field as never),
        ),
      ),
      temperature: answer(
        sourceText(["serving_temperature"]) || "No structured serving temperature.",
        values.has("serving_temperature") ? ["serving_temperature"] : [],
      ),
      food: answer(
        sourceText(["food_pairing"]) || "No structured culinary pairing.",
        values.has("food_pairing") ? ["food_pairing"] : [],
      ),
      origin: answer(
        sourceText(["region", "country", "appellation"]) || "No structured origin claim.",
        ["region", "country", "appellation"].filter((field) =>
          values.has(field as never),
        ),
      ),
      variety: answer("No general variety-knowledge field is claimed by this V2 report.", []),
      compare: answer(
        sourceText(["body", "acidity_perception", "sweetness"]) || "No structured comparison fields.",
        ["body", "acidity_perception", "sweetness"].filter((field) =>
          values.has(field as never),
        ),
      ),
      confirmed: answer(
        `${report.claims.length} source claims; ${citations.length} distinct source URL(s); conflicts are preserved rather than guessed.`,
        report.claims.length > 0 ? ["verification"] : [],
      ),
      offer: answer(
        "V2 carries no price and no qualifying affiliate offer; public price policy is shown separately.",
        [],
      ),
    },
  };
}

function markdown(
  vinintel: BenchmarkAnswerSet,
  fixture: BenchmarkAnswerSet,
  independent: BenchmarkAnswerSet,
  fixtureResult: ReturnType<typeof evaluateBenchmark>,
  independentResult: ReturnType<typeof evaluateBenchmark>,
): string {
  const rows = BENCHMARK_QUESTIONS.map((question) => {
    const fixtureCase = fixtureResult.cases.find((item) => item.questionId === question.id)!;
    const independentCase = independentResult.cases.find((item) => item.questionId === question.id)!;
    return `| ${question.id} | ${fixtureCase.vinintel.total} | ${fixtureCase.baseline.total} | ${independentCase.baseline.total} |`;
  });
  return [
    "# VinIntel benchmark — fixture baseline and independent model baseline",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "> The fixture baseline is a synthetic negative control, not a model.",
    "> The old synthetic comparison label has been removed; see the independent",
    "> model baseline for a separately generated comparison.",
    "",
    "## Method",
    "",
    "- **VinIntel**: deterministic answers built only from the V2 `reconciled` claims and their source URLs.",
    `- **Fixture baseline**: ${fixture.label}. This is a hand-authored negative control, not an AI model.`,
    `- **Independent baseline**: ${independent.label}, model \`${independent.provenance.model ?? "unknown"}\`, generated independently from the public label facts (no VinIntel claims). Frozen answers: \`benchmarks/independent-answers.json\`.`,
    "- Both baselines use the same ten questions and the same rubric. Every answer is scored per question; answer length adds nothing and unsupported assertions lose 15 points.",
    "",
    "## Results",
    "",
    "| Set | Score |",
    "|---|---:|",
    `| VinIntel | ${fixtureResult.vinintelTotal}/100 |`,
    `| Fixture baseline (synthetic control) | ${fixtureResult.baselineTotal}/100 |`,
    `| Independent model baseline | ${independentResult.baselineTotal}/100 |`,
    "",
    "### Per question",
    "",
    "| Question | VinIntel | Fixture baseline | Independent baseline |",
    "|---|---:|---:|---:|",
    ...rows,
    "",
    "## Interpretation",
    "",
    "- The fixture baseline is deliberately weak and exists to test the rubric; do not use it as a model comparison.",
    "- The independent model baseline received only public label facts and returned no source citations. Its evidence score is therefore low, while its label-level answers are scored separately.",
    "- VinIntel's higher evidence score comes from cited V2 claims, not from answer length.",
    "- The independent answers are frozen; a rerun produces the same score without an API call. The generation script is documented below for provenance.",
    "",
    "## Reproduction",
    "",
    "```bash",
    "npx tsx scripts/quality-benchmark.ts",
    "```",
    "",
    "To regenerate frozen independent answers (requires `XAI_API_KEY`; not run in CI):",
    "",
    "```bash",
    "npx tsx scripts/generate-independent-benchmark-answers.ts",
    "```",
    "",
    "## Limitations",
    "",
    "- Field annotations for the independent answers are a frozen manual review; they are recorded in the JSON file, not inferred by the scorer.",
    "- No model API is called by the scorer; the independent answers are frozen and provenance-stamped.",
    "- The V2 report used here is the audited target fixture, not production completeness evidence.",
  ].join("\n");
}

async function main() {
  const wine = loadTargetWine();
  const { report } = await runWineIntelligence({
    wine,
    fixtures: loadTargetSources(),
    dryRun: true,
  });
  const vinintel = vinintelAnswerSet(report);
  const fixture = buildFixtureBaselineAnswerSet();
  const independent = validateAnswerSet(
    JSON.parse(readFileSync("benchmarks/independent-answers.json", "utf8")),
  );
  const fixtureResult = evaluateBenchmark({ vinintel, baseline: fixture });
  const independentResult = evaluateBenchmark({ vinintel, baseline: independent });
  const output = markdown(vinintel, fixture, independent, fixtureResult, independentResult);
  writeFileSync("docs/catalog-quality-benchmark.md", `${output}\n`, "utf8");
  writeFileSync(
    "docs/catalog-quality-benchmark.json",
    `${JSON.stringify({ vinintel, fixture, independent, fixtureResult, independentResult }, null, 2)}\n`,
    "utf8",
  );
  console.log(output);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
