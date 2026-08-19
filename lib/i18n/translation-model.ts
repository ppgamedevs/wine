import { xai } from "@ai-sdk/xai";
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

function isTranslationRecord(
  value: ContentTranslationJson,
): value is { [key: string]: ContentTranslationJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMatchingRootShape(
  source: ContentTranslationJson,
  candidate: ContentTranslationJson,
): boolean {
  if (Array.isArray(source)) return Array.isArray(candidate);
  if (isTranslationRecord(source)) return isTranslationRecord(candidate);
  return typeof source === typeof candidate;
}

export function unwrapProviderTranslation(
  parsed: ContentTranslationJson,
  input: TranslateContentInput,
): ContentTranslationJson {
  if (hasMatchingRootShape(input.source, parsed) || !isTranslationRecord(parsed)) {
    return parsed;
  }
  const fieldLeaf = input.field.split(".").at(-1);
  for (const key of [
    input.field,
    fieldLeaf,
    "source",
    "content",
    "text",
    "translation",
    "translatedSource",
    "Romanian source JSON",
  ]) {
    if (!key) continue;
    const candidate = parsed[key];
    if (
      candidate !== undefined &&
      hasMatchingRootShape(input.source, candidate)
    ) {
      return candidate;
    }
  }
  const values = Object.values(parsed);
  if (
    values.length === 1 &&
    hasMatchingRootShape(input.source, values[0])
  ) {
    return values[0];
  }
  return parsed;
}

export function parseProviderTranslation(
  rawTranslationJson: string,
  input: TranslateContentInput,
): ContentTranslationJson {
  const trimmed = rawTranslationJson.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/u)?.[1];
  const candidate = fenced ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as ContentTranslationJson;
    return unwrapProviderTranslation(parsed, input);
  } catch {
    if (
      typeof input.source === "string" &&
      candidate.length > 0 &&
      !candidate.startsWith("{") &&
      !candidate.startsWith("[")
    ) {
      return candidate;
    }
    throw new Error("xAI returned invalid translation JSON.");
  }
}

function configuredXai() {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "XAI_API_KEY is required by the offline Prompt 27B translation job.",
    );
  }
  return xai;
}

export function configuredTranslationModel(): string {
  const model = process.env.I18N_TRANSLATION_MODEL?.trim();
  if (!model) {
    throw new Error(
      "I18N_TRANSLATION_MODEL must name the explicitly approved xAI model.",
    );
  }
  return model;
}

export function assertXaiTranslationConfig(): string {
  configuredXai();
  return configuredTranslationModel();
}

export async function translateContentWithXai(
  input: TranslateContentInput,
): Promise<TranslateContentResult> {
  const model = configuredTranslationModel();
  const provider = configuredXai();
  const protectedNames = (input.protectedNames ?? []).join("\n");
  const result = await generateText({
    model: provider(model),
    output: Output.object({ schema: translationOutputSchema }),
    instructions: [
      "You translate VinIntel Romanian wine content into natural English.",
      "Translate only the supplied content.",
      "Do not add, remove, improve, summarize, or infer facts.",
      "Do not alter numbers, vintages, scores, percentages, URLs, or JSON structure.",
      "Copy every numeric token character-for-character, including decimal commas such as 4,4.",
      "Preserve every HTML or Markdown token exactly, including entities such as &#8211;.",
      "Do not translate winery names, wine product names, Romanian grape variety names, or approved Romanian dish names.",
      "Copy every protected name character-for-character, without adding or removing diacritics.",
      "Preserve a protected Romanian dish phrase wherever it appears, including inside explanatory sentences.",
      "Protected names are guards only. Never insert a protected name that is absent from the source value.",
      "Use concise, neutral, buyer-first wine English.",
      "Avoid marketing exaggeration and luxury clichés.",
      "The user message is a JSON object with context and source properties.",
      "Translate only the value of source. Never return context, labels, or wrapper properties.",
      "Set translationJson to JSON.stringify(translatedSource), preserving the exact shape of source.",
      "",
      "Approved glossary:",
      translationGlossaryPrompt(),
      "",
      "Protected names:",
      protectedNames || "(none supplied)",
    ].join("\n"),
    prompt: JSON.stringify({
      context: {
        entityType: input.entityType,
        field: input.field,
      },
      source: input.source,
    }),
  });

  const value = parseProviderTranslation(result.output.translationJson, input);

  return {
    value,
    model,
    promptVersion: TRANSLATION_PROMPT_VERSION,
  };
}

