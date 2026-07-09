import { generateObject } from "ai";
import { getSommelierModel } from "@/lib/ai/model";
import {
  buildWineMedalsFromCatalogTextPrompt,
  WINE_MEDAL_EXTRACTION_PROMPT,
} from "@/lib/ai/prompts";
import { wineMedalsOnlySchema } from "@/lib/ai/schemas";
import type { WineMedal } from "@/lib/schema";
import { normalizeWineMedals } from "@/lib/wine-medals";

export interface ExtractWineMedalsInput {
  name: string;
  vintage?: number | null;
  wineryName?: string | null;
  descriptionEditorial?: string | null;
  tastingNotes?: string | null;
  tasteProfile?: string | null;
  thingsYouShouldKnow?: string[];
  sourceUrl?: string | null;
  sourcePageText?: string | null;
}

export function hasMedalExtractionSourceText(
  wine: ExtractWineMedalsInput,
): boolean {
  const insights = wine.thingsYouShouldKnow ?? [];
  return Boolean(
    wine.sourcePageText?.trim() ||
      wine.descriptionEditorial?.trim() ||
      wine.tastingNotes?.trim() ||
      wine.tasteProfile?.trim() ||
      insights.some((item) => item.trim()),
  );
}

export async function extractWineMedalsFromText(
  wine: ExtractWineMedalsInput,
): Promise<WineMedal[]> {
  if (!hasMedalExtractionSourceText(wine)) {
    return [];
  }

  const insights = wine.thingsYouShouldKnow ?? [];

  const { object } = await generateObject({
    model: getSommelierModel(),
    schema: wineMedalsOnlySchema,
    system: WINE_MEDAL_EXTRACTION_PROMPT,
    prompt: buildWineMedalsFromCatalogTextPrompt({
      name: wine.name,
      vintage: wine.vintage ?? null,
      wineryName: wine.wineryName ?? null,
      descriptionEditorial: wine.descriptionEditorial ?? null,
      tastingNotes: wine.tastingNotes ?? null,
      tasteProfile: wine.tasteProfile ?? null,
      thingsYouShouldKnow: insights,
      sourceUrl: wine.sourceUrl ?? null,
      sourcePageText: wine.sourcePageText ?? null,
    }),
    temperature: 0.2,
  });

  return normalizeWineMedals(object.medals);
}
