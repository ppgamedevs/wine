export const BENCHMARK_QUESTIONS = [
  { id: "style", prompt: "What kind of wine is this?", fields: ["wine_color", "sweetness", "type"] },
  { id: "grape", prompt: "What grape variety is used?", fields: ["grape_varieties"] },
  { id: "taste", prompt: "What does it taste like?", fields: ["taste_descriptors", "aroma_descriptors"] },
  { id: "temperature", prompt: "What temperature should I serve it at?", fields: ["serving_temperature"] },
  { id: "food", prompt: "What food works well with it?", fields: ["food_pairing"] },
  { id: "origin", prompt: "Where does it come from?", fields: ["region", "country", "appellation"] },
  { id: "variety", prompt: "What makes this variety distinctive?", fields: ["variety_knowledge"] },
  { id: "compare", prompt: "How does it compare with similar wines?", fields: ["body", "acidity_perception", "sweetness"] },
  { id: "confirmed", prompt: "What information is confirmed versus inferred?", fields: ["verification"] },
  { id: "offer", prompt: "Is there a qualifying affiliate offer?", fields: ["commercial"] },
] as const;

export interface BenchmarkAnswer {
  text: string;
  citations: string[];
  supportedFields: string[];
  unsupportedAssertions: string[];
}

export interface BenchmarkAnswerSet {
  label: string;
  provenance: {
    kind: "vinintel" | "fixture" | "independent_model";
    model?: string;
    generatedAt?: string;
    promptVersion?: string;
    notes: string;
  };
  answers: Record<string, BenchmarkAnswer>;
}

export interface BenchmarkCaseScore {
  questionId: string;
  factualCorrectness: number;
  evidenceQuality: number;
  usefulness: number;
  completeness: number;
  unsupportedPenalty: number;
  total: number;
}

export interface BenchmarkResult {
  cases: Array<{
    questionId: string;
    vinintel: BenchmarkCaseScore;
    baseline: BenchmarkCaseScore;
  }>;
  vinintelTotal: number;
  baselineTotal: number;
  baselineLabel: string;
  baselineKind: BenchmarkAnswerSet["provenance"]["kind"];
  winner: "vinintel" | "baseline" | "tie";
  notes: string[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function scoreBenchmarkAnswer(
  answer: BenchmarkAnswer,
  question: (typeof BENCHMARK_QUESTIONS)[number],
): BenchmarkCaseScore {
  const supported = new Set(answer.supportedFields);
  const fieldHits = question.fields.filter((field) => supported.has(field)).length;
  const factualCorrectness = Math.round(
    (fieldHits / Math.max(1, question.fields.length)) * 40,
  );
  const evidenceQuality = Math.round(
    clamp(
      answer.citations.length * 4 +
        (answer.citations.some((url) => /murfatlar-vinul|producer/i.test(url)) ? 6 : 0),
      0,
      20,
    ),
  );
  const usefulness = Math.round(
    clamp(
      (answer.text.trim().length > 0 ? 8 : 0) +
        (question.fields.some((field) => supported.has(field)) ? 8 : 0) +
        (answer.text.length < 3000 ? 4 : 0),
      0,
      20,
    ),
  );
  const completeness = Math.round(
    (fieldHits / Math.max(1, question.fields.length)) * 20,
  );
  const unsupportedPenalty = Math.min(60, answer.unsupportedAssertions.length * 15);
  return {
    questionId: question.id,
    factualCorrectness,
    evidenceQuality,
    usefulness,
    completeness,
    unsupportedPenalty,
    total: clamp(
      factualCorrectness + evidenceQuality + usefulness + completeness - unsupportedPenalty,
    ),
  };
}

function answerFor(
  set: BenchmarkAnswerSet,
  questionId: string,
): BenchmarkAnswer {
  const answer = set.answers[questionId];
  if (!answer) {
    throw new Error(`Benchmark answer set "${set.label}" is missing ${questionId}`);
  }
  return answer;
}

export function evaluateBenchmark(input: {
  vinintel: BenchmarkAnswerSet;
  baseline: BenchmarkAnswerSet;
}): BenchmarkResult {
  const cases = BENCHMARK_QUESTIONS.map((question) => ({
    questionId: question.id,
    vinintel: scoreBenchmarkAnswer(answerFor(input.vinintel, question.id), question),
    baseline: scoreBenchmarkAnswer(answerFor(input.baseline, question.id), question),
  }));
  const vinintelTotal = Math.round(
    cases.reduce((sum, item) => sum + item.vinintel.total, 0) / cases.length,
  );
  const baselineTotal = Math.round(
    cases.reduce((sum, item) => sum + item.baseline.total, 0) / cases.length,
  );
  return {
    cases,
    vinintelTotal,
    baselineTotal,
    baselineLabel: input.baseline.label,
    baselineKind: input.baseline.provenance.kind,
    winner:
      vinintelTotal === baselineTotal
        ? "tie"
        : vinintelTotal > baselineTotal
          ? "vinintel"
          : "baseline",
    notes: [
      "Answer length does not add score.",
      "Unsupported assertions lose 15 points each.",
      "Evidence quality rewards cited, source-backed claims.",
      "The fixture baseline is a hand-authored synthetic negative control, not a model comparison.",
    ],
  };
}

/**
 * Hand-authored negative control. This deliberately contains generic claims and
 * no citations; it exists to test the rubric, not to represent any real model.
 */
export function buildFixtureBaselineAnswerSet(): BenchmarkAnswerSet {
  const generic: BenchmarkAnswer = {
    text:
      "This is a long, generic answer. It is probably a dry white wine with about 13.5% alcohol, " +
      "gold medals and intense aromas of orange blossom and elderflower. It pairs with everything. " +
      "It likely comes from a famous region and should be served around 10-12°C. " +
      "This answer sounds detailed but several statements are not supported by the source.",
    citations: [],
    supportedFields: ["wine_color", "sweetness", "grape_varieties"],
    unsupportedAssertions: [
      "13.5% alcohol",
      "gold medals",
      "orange blossom",
      "served around 10-12°C",
    ],
  };
  return {
    label: "Fixture baseline — hand-authored synthetic negative control",
    provenance: {
      kind: "fixture",
      promptVersion: "fixture-negative-control-v1",
      notes:
        "Synthetic negative control used only to test the scoring rubric. It is not an independently generated answer and is not a model comparison.",
    },
    answers: Object.fromEntries(
      BENCHMARK_QUESTIONS.map((question) => [question.id, generic]),
    ),
  };
}

export function validateAnswerSet(value: unknown): BenchmarkAnswerSet {
  if (!value || typeof value !== "object") throw new Error("Answer set must be an object");
  const set = value as Partial<BenchmarkAnswerSet>;
  if (typeof set.label !== "string" || !set.label.trim()) {
    throw new Error("Answer set requires a label");
  }
  if (!set.provenance || typeof set.provenance !== "object") {
    throw new Error("Answer set requires provenance");
  }
  if (!set.answers || typeof set.answers !== "object") {
    throw new Error("Answer set requires answers");
  }
  for (const question of BENCHMARK_QUESTIONS) {
    const answer = (set.answers as Record<string, unknown>)[question.id];
    if (!answer || typeof answer !== "object") {
      throw new Error(`Answer set is missing ${question.id}`);
    }
    const candidate = answer as Partial<BenchmarkAnswer>;
    if (
      typeof candidate.text !== "string" ||
      !Array.isArray(candidate.citations) ||
      !Array.isArray(candidate.supportedFields) ||
      !Array.isArray(candidate.unsupportedAssertions)
    ) {
      throw new Error(`Answer ${question.id} has an invalid shape`);
    }
  }
  return set as BenchmarkAnswerSet;
}
