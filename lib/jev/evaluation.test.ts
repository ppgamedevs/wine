import { describe, expect, it } from "vitest";
import {
  parseEvaluationFixture,
  runEvaluation,
  type EvaluationCase,
  type EvaluationInterpretation,
} from "@/lib/jev/evaluation";
import type { JevIntent, JevIntentOutcome } from "@/lib/jev/types";

function intent(overrides: Partial<JevIntent> = {}): JevIntent {
  return {
    occasion: "romantic_dinner",
    foodPairing: true,
    foodPairingStrength: "central",
    foodCategory: "pasta",
    color: "white",
    sweetness: "dry",
    acidity: "low",
    body: "unknown",
    style: "unknown",
    userIntent: "discover",
    specificProductRequest: false,
    hasExclusions: true,
    confidence: {} as JevIntent["confidence"],
    confidentFields: ["color", "occasion"],
    ...overrides,
  };
}

function jevOutcome(overrides: Partial<JevIntent> = {}): JevIntentOutcome {
  return {
    status: "ok",
    intent: intent(overrides),
    meta: {
      model: "jev-latest",
      mode: "shadow",
      latencyMs: 120,
      attempts: 1,
      cache: "miss",
      requestId: "req",
      usage: { inputTokens: 100, outputTokens: 10 },
      messageFingerprint: "abc",
      messageLength: 20,
    },
  };
}

const DETERMINISTIC: EvaluationInterpretation = {
  fields: {
    occasion: "cina-romantica",
    color: "white",
    sweetness: "sec",
    budgetSpecified: true,
    budgetMin: 0,
    budgetMax: 80,
  },
};

const CASES: EvaluationCase[] = [
  {
    id: "ref-1",
    locale: "ro",
    message: "Vreau un vin alb pentru paste, maxim 80 de lei",
    labelStatus: "deterministic_reference",
    expected: { color: "white", budgetMax: 80 },
  },
  {
    id: "unreviewed-1",
    locale: "ro",
    message: "Ceva bun",
    labelStatus: "unreviewed",
  },
];

describe("runEvaluation", () => {
  it("only reports accuracy over labels that exist", async () => {
    const { summary } = await runEvaluation({
      cases: CASES,
      runDeterministic: () => DETERMINISTIC,
      runJev: async () => jevOutcome(),
    });

    expect(summary.cases).toBe(2);
    expect(summary.labelledDeterministicReference).toBe(1);
    expect(summary.unlabelled).toBe(1);
    expect(summary.deterministicReferenceAccuracy).toBe(1);
    expect(summary.jevAccuracy).toBe(1);
    expect(summary.humanApprovedAccuracy).toBeNull();
    expect(summary.notes.join(" ")).toContain("No human-approved labels");
  });

  it("measures disagreement against the deterministic engine", async () => {
    const { summary } = await runEvaluation({
      cases: [CASES[0]!],
      runDeterministic: () => DETERMINISTIC,
      runJev: async () => jevOutcome({ color: "red" }),
    });
    expect(summary.disagreementRate).toBe(1);
  });

  it("tracks failures without throwing", async () => {
    const { summary, results } = await runEvaluation({
      cases: [CASES[0]!],
      runDeterministic: () => DETERMINISTIC,
      runJev: async () => ({
        status: "unavailable",
        reason: "timeout",
        meta: { latencyMs: 6_000, attempts: 2, messageFingerprint: "abc" },
      }),
    });
    expect(summary.jevFailureRate).toBe(1);
    expect(results[0]?.jevStatus).toBe("unavailable");
    expect(summary.notes.join(" ")).toContain("failed");
  });

  it("estimates cost only when pricing is supplied", async () => {
    const withoutPricing = await runEvaluation({
      cases: [CASES[0]!],
      runDeterministic: () => DETERMINISTIC,
      runJev: async () => jevOutcome(),
    });
    expect(withoutPricing.summary.estimatedCostUsd).toBeNull();

    const withPricing = await runEvaluation({
      cases: [CASES[0]!],
      runDeterministic: () => DETERMINISTIC,
      runJev: async () => jevOutcome(),
      pricing: { inputPerMillionUsd: 10, outputPerMillionUsd: 0 },
    });
    expect(withPricing.summary.estimatedCostUsd).toBe(0.001);
  });

  it("scores human-approved labels for both engines", async () => {
    const { summary } = await runEvaluation({
      cases: [
        {
          ...CASES[0]!,
          labelStatus: "human_approved",
          expected: { color: "white", occasion: "cina-romantica" },
        },
      ],
      runDeterministic: () => DETERMINISTIC,
      runJev: async () => jevOutcome(),
    });
    expect(summary.labelledHumanApproved).toBe(1);
    expect(summary.deterministicHumanApprovedAccuracy).toBe(1);
    // Jev's occasion is mapped into VinIntel's occasion id before comparing.
    expect(summary.humanApprovedAccuracy).toBe(1);
  });
});

describe("parseEvaluationFixture", () => {
  it("rejects malformed fixtures", () => {
    expect(() => parseEvaluationFixture({})).toThrow();
    expect(() => parseEvaluationFixture([{ id: "x" }])).toThrow();
  });

  it("defaults unreviewed cases safely", () => {
    const cases = parseEvaluationFixture([
      { id: "x", message: "test", labelStatus: "made-up" },
    ]);
    expect(cases[0]?.labelStatus).toBe("unreviewed");
    expect(cases[0]?.locale).toBe("ro");
  });
});
