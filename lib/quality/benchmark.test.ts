import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BENCHMARK_QUESTIONS,
  buildFixtureBaselineAnswerSet,
  evaluateBenchmark,
  validateAnswerSet,
} from "@/lib/quality/benchmark";

const independent = validateAnswerSet(
  JSON.parse(readFileSync("benchmarks/independent-answers.json", "utf8")),
);

describe("benchmark provenance", () => {
  it("keeps the synthetic fixture explicitly separate from a real model", () => {
    const fixture = buildFixtureBaselineAnswerSet();
    expect(fixture.label).toContain("hand-authored");
    expect(fixture.provenance.kind).toBe("fixture");
    expect(fixture.provenance.notes).toContain("not an independently generated");
  });

  it("has frozen independent answers for every question", () => {
    expect(independent.provenance.kind).toBe("independent_model");
    expect(independent.provenance.model).toContain("grok");
    expect(Object.keys(independent.answers).sort()).toEqual(
      BENCHMARK_QUESTIONS.map((question) => question.id).sort(),
    );
    expect(independent.answers.taste?.text.length).toBeGreaterThan(0);
  });

  it("scores the independent baseline separately and deterministically", () => {
    const fixture = buildFixtureBaselineAnswerSet();
    const vinintel = {
      label: "VinIntel",
      provenance: { kind: "vinintel" as const, notes: "test" },
      answers: Object.fromEntries(
        BENCHMARK_QUESTIONS.map((question) => [
          question.id,
          {
            text: "Source-backed answer",
            citations: ["https://producer.example/tech"],
            supportedFields: ["wine_color", "sweetness", "type", "grape_varieties"],
            unsupportedAssertions: [],
          },
        ]),
      ),
    };
    const first = evaluateBenchmark({ vinintel, baseline: independent });
    const second = evaluateBenchmark({ vinintel, baseline: independent });
    expect(first).toEqual(second);
    expect(first.baselineLabel).toBe("Independent Grok baseline");
    expect(first.baselineKind).toBe("independent_model");
    expect(first.baselineTotal).not.toBe(
      evaluateBenchmark({ vinintel, baseline: fixture }).baselineTotal,
    );
  });
});
