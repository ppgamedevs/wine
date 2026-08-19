import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { ContentTranslationJson } from "@/lib/schema";
import { translationGlossaryPrompt } from "@/lib/i18n/translation-glossary";

export const TRANSLATION_PROMPT_VERSION = "prompt27b-v1";

const translationOutputSchema = z.object({
  translationJson: z
    .string()
    .describe("A valid JSON encoding of the translated value."),
});

export interface TranslateContentInput {
  source: ContentTranslationJson;
  field: string;
  entityType: string;
  protectedNames?: readonly string[];
}

export interface TranslateContentResult {
  value: ContentTranslationJson;
  model: string;
  promptVersion: string;
}

function configuredOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required by the offline Prompt 27B translation job.",
    );
  }
  return createOpenAI({ apiKey });
}

export function configuredTranslationModel(): string {
  const model = process.env.I18N_TRANSLATION_MODEL?.trim();
  if (!model) {
    throw new Error(
      "I18N_TRANSLATION_MODEL must name the explicitly approved OpenAI model.",
    );
  }
  return model;
}

export function assertOpenAITranslationConfig(): string {
  configuredOpenAI();
  return configuredTranslationModel();
}

export async function translateContentWithOpenAI(
  input: TranslateContentInput,
): Promise<TranslateContentResult> {
  const model = configuredTranslationModel();
  const provider = configuredOpenAI();
  const protectedNames = (input.protectedNames ?? []).join("\n");
  const result = await generateText({
    model: provider(model),
    output: Output.object({ schema: translationOutputSchema }),
    instructions: [
      "You translate VinIntel Romanian wine content into natural English.",
      "Translate only the supplied content.",
      "Do not add, remove, improve, summarize, or infer facts.",
      "Do not alter numbers, vintages, scores, percentages, URLs, or JSON structure.",
      "Do not translate winery names, wine product names, Romanian grape variety names, or approved Romanian dish names.",
      "Use concise, neutral, buyer-first wine English.",
      "Avoid marketing exaggeration and luxury clichés.",
      "Return only a JSON string in translationJson that preserves the exact source JSON shape.",
      "",
      "Approved glossary:",
      translationGlossaryPrompt(),
      "",
      "Protected names:",
      protectedNames || "(none supplied)",
    ].join("\n"),
    prompt: [
      `Entity type: ${input.entityType}`,
      `Field: ${input.field}`,
      "Romanian source JSON:",
      JSON.stringify(input.source),
    ].join("\n"),
  });

  let value: ContentTranslationJson;
  try {
    value = JSON.parse(result.output.translationJson) as ContentTranslationJson;
  } catch {
    throw new Error("OpenAI returned invalid translation JSON.");
  }

  return {
    value,
    model,
    promptVersion: TRANSLATION_PROMPT_VERSION,
  };
}

