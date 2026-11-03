/**
 * Offline evaluation harness for the Sommelier intent layer.
 *
 * It compares three interpretations of the same request:
 *   1. the existing deterministic VinIntel parser,
 *   2. Jev's validated structured intent,
 *   3. the expected interpretation from a labelled fixture.
 *
 * Accuracy is only reported over fixtures explicitly marked `human_approved`.
 * A fixture with `deterministic_reference` labels measures parser agreement, not
 * human agreement, and is reported separately. This prevents invented accuracy
 * numbers.
 */
import type { JevIntent, JevIntentOutcome } from "@/lib/jev/types";
import {
  toSommelierColor,
  toSommelierOccasion,
  toSommelierSweetness,
} from "@/lib/jev/intent";
import type { AppLocale } from "@/i18n/locale";

export const EVALUATION_FIELDS = [
  "occasion",
  "foodCategory",
  "color",
  "sweetness",
  "acidity",
  "body",
  "style",
  "userIntent",
  "foodPairing",
  "specificProductRequest",
  "budgetSpecified",
  "budgetMin",
  "budgetMax",
] as const;

export type EvaluationField = (typeof EVALUATION_FIELDS)[number];

export type EvaluationLabelStatus =
  | "human_approved"
  | "deterministic_reference"
  | "unreviewed";

export interface EvaluationCase {
  id: string;
  locale: AppLocale;
  message: string;
  /** Only fields present here are scored. */
  expected?: Partial<Record<EvaluationField, string | number | boolean | null>>;
  labelStatus: EvaluationLabelStatus;
  notes?: string;
}

export interface EvaluationInterpretation {
  fields: Partial<Record<EvaluationField, string | number | boolean | null>>;
}

/** Jev intent + deterministic budget, flattened for comparison. */
export function interpretationFromJev(
  intent: JevIntent,
  budget: { budgetSpecified: boolean; budgetMin: number; budgetMax: number },
): EvaluationInterpretation {
  return {
    fields: {
      // Map to VinIntel vocabulary so the comparison is like with like.
      // Unknown stays unknown: a default must never be credited as a match.
      occasion:
        intent.occasion === "unknown"
          ? "unknown"
          : toSommelierOccasion(intent.occasion),
      foodCategory: intent.foodCategory,
      color:
        intent.color === "unknown"
          ? "unknown"
          : toSommelierColor(intent.color),
      sweetness:
        intent.sweetness === "unknown"
          ? "unknown"
          : toSommelierSweetness(intent.sweetness),
      acidity: intent.acidity,
      body: intent.body,
      style: intent.style,
      userIntent: intent.userIntent,
      foodPairing: intent.foodPairing,
      specificProductRequest: intent.specificProductRequest,
      budgetSpecified: budget.budgetSpecified,
      budgetMin: budget.budgetSpecified ? budget.budgetMin : null,
      budgetMax: budget.budgetSpecified ? budget.budgetMax : null,
    },
  };
}

export interface FieldComparison {
  field: EvaluationField;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
  match: boolean;
}

export function compareToExpected(
  interpretation: EvaluationInterpretation,
  expected: EvaluationCase["expected"],
): FieldComparison[] {
  if (!expected) return [];
  const comparisons: FieldComparison[] = [];
  for (const field of EVALUATION_FIELDS) {
    if (!(field in expected)) continue;
    const expectedValue = expected[field] ?? null;
    const actualValue = interpretation.fields[field] ?? null;
    comparisons.push({
      field,
      expected: expectedValue,
      actual: actualValue,
      match: normalizeComparable(expectedValue) === normalizeComparable(actualValue),
    });
  }
  return comparisons;
}

function normalizeComparable(value: string | number | boolean | null): string {
  if (value == null) return "null";
  if (typeof value === "string") return value.trim().toLowerCase();
  return String(value);
}

export interface EvaluationCaseResult {
  id: string;
  labelStatus: EvaluationLabelStatus;
  deterministic: FieldComparison[];
  jev: FieldComparison[];
  deterministicMatchesJev: boolean | null;
  jevStatus: JevIntentOutcome["status"];
  jevFailureReason: string | null;
  latencyMs: number;
  tokens: { input: number; output: number };
}

export interface EvaluationSummary {
  cases: number;
  labelledHumanApproved: number;
  labelledDeterministicReference: number;
  unlabelled: number;
  /** Jev accuracy over human-approved labels only; null when none exist. */
  humanApprovedAccuracy: number | null;
  /** Deterministic accuracy over human-approved labels only. */
  deterministicHumanApprovedAccuracy: number | null;
  deterministicReferenceAccuracy: number | null;
  jevAccuracy: number | null;
  jevFailureRate: number;
  disagreementRate: number | null;
  perField: Array<{
    field: EvaluationField;
    deterministic: { correct: number; total: number; accuracy: number | null };
    jev: { correct: number; total: number; accuracy: number | null };
  }>;
  latencyMs: { p50: number; p95: number; mean: number };
  tokens: { input: number; output: number };
  /** Null unless a pricing table is supplied. */
  estimatedCostUsd: number | null;
  notes: string[];
}

export interface EvaluationPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

export interface EvaluationOptions {
  cases: EvaluationCase[];
  /** Runs the real Jev service or a recorded fake. */
  runJev: (testCase: EvaluationCase) => Promise<JevIntentOutcome>;
  /** Deterministic parser for the same request. */
  runDeterministic: (testCase: EvaluationCase) => EvaluationInterpretation;
  pricing?: EvaluationPricing;
}

function ratio(correct: number, total: number): number | null {
  if (total === 0) return null;
  return Number((correct / total).toFixed(3));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

export async function runEvaluation(
  options: EvaluationOptions,
): Promise<{ results: EvaluationCaseResult[]; summary: EvaluationSummary }> {
  const results: EvaluationCaseResult[] = [];
  const notes: string[] = [];

  for (const testCase of options.cases) {
    const deterministic = options.runDeterministic(testCase);
    const deterministicComparisons = compareToExpected(
      deterministic,
      testCase.expected,
    );

    let jevComparisons: FieldComparison[] = [];
    let jevFields: EvaluationInterpretation["fields"] | null = null;
    let jevStatus: JevIntentOutcome["status"] = "skipped";
    let jevFailureReason: string | null = null;
    let latencyMs = 0;
    let tokens = { input: 0, output: 0 };

    try {
      const outcome = await options.runJev(testCase);
      jevStatus = outcome.status;
      if (outcome.status === "ok") {
        jevFields = interpretationFromJev(outcome.intent, {
          budgetSpecified: Boolean(deterministic.fields.budgetSpecified),
          budgetMin: Number(deterministic.fields.budgetMin ?? 0),
          budgetMax: Number(deterministic.fields.budgetMax ?? 0),
        }).fields;
        jevComparisons = compareToExpected(
          { fields: jevFields },
          testCase.expected,
        );
        latencyMs = outcome.meta.latencyMs;
        tokens = {
          input: outcome.meta.usage.inputTokens ?? 0,
          output: outcome.meta.usage.outputTokens ?? 0,
        };
      } else if (outcome.status === "unavailable") {
        jevFailureReason = outcome.reason;
        latencyMs = outcome.meta.latencyMs;
      }
    } catch (error) {
      jevStatus = "unavailable";
      jevFailureReason = error instanceof Error ? error.message : "unknown";
    }

    const sharedFields = EVALUATION_FIELDS.filter(
      (field) =>
        jevFields?.[field] != null &&
        jevFields[field] !== "unknown" &&
        deterministic.fields[field] != null &&
        deterministic.fields[field] !== "unknown",
    );
    const deterministicMatchesJev =
      sharedFields.length === 0
        ? null
        : sharedFields.every(
            (field) =>
              normalizeComparable(jevFields?.[field] ?? null) ===
              normalizeComparable(deterministic.fields[field] ?? null),
          );

    results.push({
      id: testCase.id,
      labelStatus: testCase.labelStatus,
      deterministic: deterministicComparisons,
      jev: jevComparisons,
      deterministicMatchesJev,
      jevStatus,
      jevFailureReason,
      latencyMs,
      tokens,
    });
  }

  const perField = EVALUATION_FIELDS.map((field) => {
    const counts = {
      deterministic: { correct: 0, total: 0 },
      jev: { correct: 0, total: 0 },
    };
    for (const result of results) {
      const deterministicComparison = result.deterministic.find(
        (entry) => entry.field === field,
      );
      if (deterministicComparison) {
        counts.deterministic.total += 1;
        if (deterministicComparison.match) counts.deterministic.correct += 1;
      }
      const jevComparison = result.jev.find((entry) => entry.field === field);
      if (jevComparison) {
        counts.jev.total += 1;
        if (jevComparison.match) counts.jev.correct += 1;
      }
    }
    return {
      field,
      deterministic: {
        ...counts.deterministic,
        accuracy: ratio(counts.deterministic.correct, counts.deterministic.total),
      },
      jev: {
        ...counts.jev,
        accuracy: ratio(counts.jev.correct, counts.jev.total),
      },
    };
  });

  const humanApprovedCases = results.filter(
    (result) => result.labelStatus === "human_approved",
  );
  const deterministicReferenceCases = results.filter(
    (result) => result.labelStatus === "deterministic_reference",
  );
  const deterministicReference = deterministicReferenceCases.length;
  const humanApproved = humanApprovedCases.length;
  const unlabelled = options.cases.length - humanApproved - deterministicReference;

  const humanApprovedDeterministic = humanApprovedCases.flatMap(
    (result) => result.deterministic,
  );
  const humanApprovedJev = humanApprovedCases.flatMap((result) => result.jev);
  const deterministicComparisons = deterministicReferenceCases.flatMap(
    (result) => result.deterministic,
  );
  const jevComparisons = deterministicReferenceCases.flatMap(
    (result) => result.jev,
  );

  const jevFailures = results.filter(
    (result) => result.jevStatus !== "ok" && result.jevStatus !== "skipped",
  ).length;
  const comparedCases = results.filter(
    (result) => result.deterministicMatchesJev != null,
  );

  const latencies = results.map((result) => result.latencyMs).filter((value) => value > 0);
  const inputTokens = results.reduce((sum, result) => sum + result.tokens.input, 0);
  const outputTokens = results.reduce((sum, result) => sum + result.tokens.output, 0);

  if (humanApproved === 0) {
    notes.push(
      "No human-approved labels present: accuracy is reported for deterministic reference labels only.",
    );
  }
  if (jevFailures > 0) {
    notes.push(`${jevFailures} Jev evaluations failed; failures fall back to deterministic.`);
  }

  const estimatedCostUsd = options.pricing
    ? Number(
        (
          (inputTokens / 1_000_000) * options.pricing.inputPerMillionUsd +
          (outputTokens / 1_000_000) * options.pricing.outputPerMillionUsd
        ).toFixed(4),
      )
    : null;

  return {
    results,
    summary: {
      cases: options.cases.length,
      labelledHumanApproved: humanApproved,
      labelledDeterministicReference: deterministicReference,
      unlabelled,
      humanApprovedAccuracy: ratio(
        humanApprovedJev.filter((entry) => entry.match).length,
        humanApprovedJev.length,
      ),
      deterministicHumanApprovedAccuracy: ratio(
        humanApprovedDeterministic.filter((entry) => entry.match).length,
        humanApprovedDeterministic.length,
      ),
      deterministicReferenceAccuracy: ratio(
        deterministicComparisons.filter((entry) => entry.match).length,
        deterministicComparisons.length,
      ),
      jevAccuracy: ratio(
        jevComparisons.filter((entry) => entry.match).length,
        jevComparisons.length,
      ),
      jevFailureRate:
        options.cases.length === 0
          ? 0
          : Number((jevFailures / options.cases.length).toFixed(3)),
      disagreementRate:
        comparedCases.length === 0
          ? null
          : Number(
              (
                comparedCases.filter((result) => result.deterministicMatchesJev === false)
                  .length / comparedCases.length
              ).toFixed(3),
            ),
      perField,
      latencyMs: {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        mean:
          latencies.length === 0
            ? 0
            : Math.round(
                latencies.reduce((sum, value) => sum + value, 0) / latencies.length,
              ),
      },
      tokens: { input: inputTokens, output: outputTokens },
      estimatedCostUsd,
      notes,
    },
  };
}

/** Parse a fixture file, rejecting malformed input early. */
export function parseEvaluationFixture(raw: unknown): EvaluationCase[] {
  if (!Array.isArray(raw)) {
    throw new Error("Evaluation fixture must be an array of cases.");
  }
  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Evaluation case ${index} is not an object.`);
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : `case-${index}`;
    const message = typeof record.message === "string" ? record.message : "";
    if (!message) throw new Error(`Evaluation case ${id} has no message.`);
    const locale = record.locale === "en" ? "en" : "ro";
    const labelStatus =
      record.labelStatus === "human_approved" ||
      record.labelStatus === "deterministic_reference"
        ? record.labelStatus
        : "unreviewed";
    return {
      id,
      locale,
      message,
      labelStatus,
      expected:
        record.expected && typeof record.expected === "object"
          ? (record.expected as EvaluationCase["expected"])
          : undefined,
      notes: typeof record.notes === "string" ? record.notes : undefined,
    };
  });
}
