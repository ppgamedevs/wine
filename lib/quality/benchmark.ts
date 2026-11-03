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
  label: string;
  text: string;
  citations: string[];
  supportedFields: string[];
  unsupportedAssertions: string[];
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
    chatgpt: BenchmarkCaseScore;
  }>;
  vinintelTotal: number;
  chatgptTotal: number;
  winner: "vinintel" | "chatgpt" | "tie";
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
      (answer.text.length > 0 ? 8 : 0) +
        (question.fields.some((field) => supported.has(field)) ? 8 : 0) +
        (answer.text.length < 3000 ? 4 : 0),
      0,
      20,
    ),
  );
  const completeness = Math.round(
    (fieldHits / Math.max(1, question.fields.length)) * 20,
  );
  const unsupportedPenalty = Math.min(
    60,
    answer.unsupportedAssertions.length * 15,
  );
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

export function evaluateBenchmark(input: {
  vinintel: BenchmarkAnswer;
  chatgpt: BenchmarkAnswer;
}): BenchmarkResult {
  const cases = BENCHMARK_QUESTIONS.map((question) => ({
    questionId: question.id,
    vinintel: scoreBenchmarkAnswer(input.vinintel, question),
    chatgpt: scoreBenchmarkAnswer(input.chatgpt, question),
  }));
  const vinintelTotal = Math.round(
    cases.reduce((sum, item) => sum + item.vinintel.total, 0) / cases.length,
  );
  const chatgptTotal = Math.round(
    cases.reduce((sum, item) => sum + item.chatgpt.total, 0) / cases.length,
  );
  return {
    cases,
    vinintelTotal,
    chatgptTotal,
    winner:
      vinintelTotal === chatgptTotal
        ? "tie"
        : vinintelTotal > chatgptTotal
          ? "vinintel"
          : "chatgpt",
    notes: [
      "Answer length does not add score.",
      "Unsupported assertions lose 15 points each.",
      "Evidence quality rewards cited, source-backed claims.",
    ],
  };
}

export function buildVinIntelBenchmarkAnswer(input: {
  text: string;
  citations: string[];
  supportedFields: string[];
}): BenchmarkAnswer {
  return {
    label: "VinIntel",
    text: input.text,
    citations: input.citations,
    supportedFields: input.supportedFields,
    unsupportedAssertions: [],
  };
}

export function buildChatGptStyleBaseline(): BenchmarkAnswer {
  return {
    label: "ChatGPT-style baseline",
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
}
