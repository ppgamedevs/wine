/**
 * Regenerate the frozen independently generated benchmark answers.
 *
 * This is intentionally NOT run in CI. It requires a live XAI_API_KEY and makes
 * one bounded model call from label facts only. The scorer never calls a model.
 *
 *   npx tsx scripts/generate-independent-benchmark-answers.ts
 */
import "../lib/load-env";
import { readFileSync, writeFileSync } from "node:fs";
import { envOrUndefined } from "@/lib/env";
import {
  BENCHMARK_QUESTIONS,
  validateAnswerSet,
  type BenchmarkAnswerSet,
} from "@/lib/quality/benchmark";

const PROMPT = `You are an independent wine writer answering a blind benchmark. Use only the label facts below. Do not claim laboratory measurements, awards, or exact sensory descriptors unless the label supplies them. Clearly say when something is uncertain.

Label facts:
- Name: Zestrea Muscat Ottonel Demisec, Murfatlar, 0.75L
- Producer: Murfatlar
- Region: Murfatlar, Romania
- Type: white
- Sweetness: demisec (medium-dry)
- Grape: Muscat Ottonel
- Vintage: not stated

Answer each question with 1-3 concise sentences. Return a single JSON object with exactly these keys: ${BENCHMARK_QUESTIONS.map((question) => question.id).join(", ")}. Do not add markdown fences.`;

async function main() {
  const apiKey = envOrUndefined("XAI_API_KEY");
  if (!apiKey) throw new Error("XAI_API_KEY is required to regenerate independent answers.");
  const model = envOrUndefined("XAI_BENCHMARK_MODEL") ?? "grok-4.20-0309-non-reasoning";
  const current = validateAnswerSet(
    JSON.parse(readFileSync("benchmarks/independent-answers.json", "utf8")),
  );

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{ role: "user", content: PROMPT }],
    }),
  });
  if (!response.ok) {
    throw new Error(`xAI request failed: ${response.status} ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) as Record<string, string>;

  const answers = Object.fromEntries(
    BENCHMARK_QUESTIONS.map((question) => {
      const previous = current.answers[question.id]!;
      return [
        question.id,
        {
          ...previous,
          text: String(parsed[question.id] ?? previous.text),
        },
      ];
    }),
  ) as BenchmarkAnswerSet["answers"];

  const next: BenchmarkAnswerSet = {
    label: "Independent Grok baseline",
    provenance: {
      kind: "independent_model",
      model: payload.model ?? model,
      generatedAt: new Date().toISOString(),
      generator: "scripts/generate-independent-benchmark-answers.ts",
      promptVersion: "independent-label-blind-v1",
      notes:
        "One independent model response to the ten frozen questions from public label facts only. Annotations are preserved from the previous frozen manual review and must be re-reviewed if text changes.",
    },
    answers,
  };
  writeFileSync(
    "benchmarks/independent-answers.json",
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );
  console.log(`Updated benchmarks/independent-answers.json with ${next.provenance.model}.`);
  console.log("Review annotations before committing regenerated answers.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
