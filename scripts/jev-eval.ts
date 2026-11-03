/**
 * Offline Sommelier intent evaluation.
 *
 *   npm run jev:eval                       # deterministic only (no API key needed)
 *   npm run jev:eval -- --jev              # adds Jev in shadow mode (needs TYPESAFE_API_KEY)
 *   npm run jev:eval -- --jev --limit=50
 *   npm run jev:eval -- --fixture=data/jev-eval/other.json --json
 *
 * The harness never enables live mode: it only measures. Nothing is written to
 * the database and no production behaviour changes.
 */
import "../lib/load-env";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  parseEvaluationFixture,
  runEvaluation,
  type EvaluationCase,
  type EvaluationInterpretation,
} from "../lib/jev/evaluation";
import { resolveJevConfig } from "../lib/jev/config";
import { JevDecisionService } from "../lib/jev/service";
import type { JevIntentOutcome } from "../lib/jev/types";
import { parseSommelierRequest } from "../lib/sommelier-chat";

interface Args {
  fixture: string;
  useJev: boolean;
  json: boolean;
  limit: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    fixture: "data/jev-eval/sommelier-intent.fixture.json",
    useJev: false,
    json: false,
    limit: null,
    inputPricePerMillion: null,
    outputPricePerMillion: null,
  };
  for (const raw of argv) {
    if (raw === "--jev") args.useJev = true;
    else if (raw === "--json") args.json = true;
    else if (raw.startsWith("--fixture=")) args.fixture = raw.slice("--fixture=".length);
    else if (raw.startsWith("--limit=")) {
      const value = Number(raw.slice("--limit=".length));
      if (Number.isFinite(value) && value > 0) args.limit = Math.floor(value);
    } else if (raw.startsWith("--input-price=")) {
      const value = Number(raw.slice("--input-price=".length));
      if (Number.isFinite(value) && value >= 0) args.inputPricePerMillion = value;
    } else if (raw.startsWith("--output-price=")) {
      const value = Number(raw.slice("--output-price=".length));
      if (Number.isFinite(value) && value >= 0) args.outputPricePerMillion = value;
    }
  }
  return args;
}

function deterministicInterpretation(
  testCase: EvaluationCase,
): EvaluationInterpretation {
  const parsed = parseSommelierRequest(testCase.message, [], testCase.locale);
  return {
    fields: {
      occasion: parsed.input.occasion,
      color: parsed.input.color,
      sweetness: parsed.input.sweetness,
      acidity: parsed.input.acidityPreference ?? null,
      body: parsed.input.bodyPreference ?? null,
      budgetSpecified: parsed.budget.budgetSpecified,
      budgetMin: parsed.budget.budgetSpecified ? parsed.budget.budgetMin : null,
      budgetMax: parsed.budget.budgetSpecified ? parsed.budget.budgetMax : null,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixturePath = path.resolve(process.cwd(), args.fixture);
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  let cases = parseEvaluationFixture(parsed);
  if (args.limit != null) cases = cases.slice(0, args.limit);

  let runJev = async (): Promise<JevIntentOutcome> => ({
    status: "skipped",
    reason: "mode_off",
  });

  if (args.useJev) {
    const config = resolveJevConfig({ ...process.env, JEV_MODE: "shadow" });
    if (!config.enabled) {
      console.warn(
        "JEV: --jev requested but no TYPESAFE_API_KEY is configured. Running deterministic only.",
      );
    } else {
      const service = new JevDecisionService({ config });
      runJev = (testCase) =>
        service.classifySommelierIntent({
          userMessage: testCase.message,
          locale: testCase.locale,
        });
    }
  }

  const { results, summary } = await runEvaluation({
    cases,
    runDeterministic: deterministicInterpretation,
    runJev,
    pricing:
      args.inputPricePerMillion != null && args.outputPricePerMillion != null
        ? {
            inputPerMillionUsd: args.inputPricePerMillion,
            outputPerMillionUsd: args.outputPricePerMillion,
          }
        : undefined,
  });

  if (args.json) {
    console.log(JSON.stringify({ summary, results }, null, 2));
    return;
  }

  console.log(`\n=== Sommelier intent evaluation (${summary.cases} cases) ===`);
  console.log(`source: ${path.relative(process.cwd(), fixturePath)}`);
  console.log(`labels: ${summary.labelledHumanApproved} human-approved, ${summary.labelledDeterministicReference} deterministic reference, ${summary.unlabelled} unreviewed`);
  console.log(`deterministic accuracy (reference labels): ${format(summary.deterministicReferenceAccuracy)}`);
  console.log(`jev accuracy (reference labels):           ${format(summary.jevAccuracy)}`);
  console.log(`human-approved accuracy (jev):             ${format(summary.humanApprovedAccuracy)}`);
  console.log(`human-approved accuracy (deterministic):   ${format(summary.deterministicHumanApprovedAccuracy)}`);
  console.log(`jev failure rate:                          ${(summary.jevFailureRate * 100).toFixed(1)}%`);
  console.log(`disagreement rate:                         ${format(summary.disagreementRate)}`);
  console.log(`latency p50/p95:                           ${summary.latencyMs.p50}ms / ${summary.latencyMs.p95}ms`);
  console.log(`tokens in/out:                             ${summary.tokens.input} / ${summary.tokens.output}`);
  console.log(
    `estimated cost:                            ${
      summary.estimatedCostUsd == null
        ? "n/a (no pricing supplied)"
        : `$${summary.estimatedCostUsd}`
    }`,
  );
  for (const note of summary.notes) console.log(`note: ${note}`);

  const mismatches = results.flatMap((result) => {
    if (result.labelStatus !== "deterministic_reference") return [];
    const failures = result.deterministic
      .filter((entry) => !entry.match)
      .map((entry) => `${entry.field}: expected ${String(entry.expected)}, got ${String(entry.actual)}`);
    if (failures.length === 0) return [];
    return [`- ${result.id}\n    ${failures.join("\n    ")}`];
  });

  if (mismatches.length > 0) {
    console.log("\nDeterministic mismatches against reference labels:");
    console.log(mismatches.join("\n"));
  }
}

function format(value: number | null): string {
  return value == null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

main().catch((error) => {
  console.error("jev:eval failed", error);
  process.exitCode = 1;
});
