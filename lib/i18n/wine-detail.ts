import "server-only";

import type { ContentTranslationJson } from "@/lib/schema";
import { getReadyTranslationValue } from "@/lib/i18n/content-translations";
import { getWineTypeLabel } from "@/lib/format";
import type { WineWithRelations } from "@/types";

const TRANSLATABLE_FIELDS = [
  "descriptionEditorial",
  "valueExplanation",
  "tasteProfile",
  "thingsYouShouldKnow",
  "tastingNotes",
  "imageAlt",
] as const;

export type WineDetailTranslationField =
  (typeof TRANSLATABLE_FIELDS)[number];

export type WineDetailTranslationValues = Partial<
  Record<WineDetailTranslationField, ContentTranslationJson>
>;

export interface LocalizedWineDetail {
  wine: WineWithRelations;
  limitedData: boolean;
  missingFields: WineDetailTranslationField[];
}

function sourceValue(
  wine: WineWithRelations,
  field: WineDetailTranslationField,
): ContentTranslationJson | undefined {
  const value = wine[field];
  if (value == null) return undefined;
  if (typeof value === "string") {
    return value.trim() ? value : undefined;
  }
  return value.length > 0 ? value : undefined;
}

function translatedString(
  value: ContentTranslationJson | undefined,
): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function translatedStringList(
  value: ContentTranslationJson | undefined,
): string[] | null {
  if (
    !Array.isArray(value) ||
    !value.every((item): item is string => typeof item === "string")
  ) {
    return null;
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function englishImageAlt(wine: WineWithRelations): string {
  const parts = [wine.name];
  if (wine.vintage) parts.push(String(wine.vintage));
  if (wine.winery?.name) parts.push(`by ${wine.winery.name}`);
  parts.push(`${getWineTypeLabel(wine.type, "en").toLowerCase()} wine`);
  return parts.join(", ");
}

export function applyEnglishWineDetailTranslations(
  wine: WineWithRelations,
  translations: WineDetailTranslationValues,
): LocalizedWineDetail {
  const missingFields: WineDetailTranslationField[] = [];

  for (const field of TRANSLATABLE_FIELDS) {
    if (sourceValue(wine, field) === undefined) continue;
    const translated =
      field === "thingsYouShouldKnow"
        ? translatedStringList(translations[field])
        : translatedString(translations[field]);
    if (translated == null) missingFields.push(field);
  }

  const descriptionEditorial = translatedString(
    translations.descriptionEditorial,
  );
  const valueExplanation = translatedString(translations.valueExplanation);
  const tasteProfile = translatedString(translations.tasteProfile);
  const tastingNotes = translatedString(translations.tastingNotes);
  const imageAlt =
    translatedString(translations.imageAlt) ?? englishImageAlt(wine);
  const thingsYouShouldKnow =
    translatedStringList(translations.thingsYouShouldKnow) ?? [];
  const hasEditorialSource = [
    sourceValue(wine, "descriptionEditorial"),
    sourceValue(wine, "valueExplanation"),
    sourceValue(wine, "tasteProfile"),
    sourceValue(wine, "thingsYouShouldKnow"),
    sourceValue(wine, "tastingNotes"),
  ].some((value) => value !== undefined);

  return {
    wine: {
      ...wine,
      descriptionEditorial,
      valueExplanation,
      tasteProfile,
      tastingNotes,
      imageAlt,
      thingsYouShouldKnow,
      producerContent: wine.producerContent
        ? {
            ...wine.producerContent,
            viticulture: undefined,
            tastingNotes: undefined,
            culinaryPairings: undefined,
          }
        : null,
    },
    limitedData: !hasEditorialSource || missingFields.length > 0,
    missingFields,
  };
}

export async function localizeWineDetailForEnglish(
  wine: WineWithRelations,
): Promise<LocalizedWineDetail> {
  const entries = await Promise.all(
    TRANSLATABLE_FIELDS.map(async (field) => {
      const value = sourceValue(wine, field);
      if (value === undefined) return [field, undefined] as const;
      const translation = await getReadyTranslationValue({
        entityType: "wine",
        entityId: String(wine.id),
        field,
        sourceLocale: "ro",
        targetLocale: "en",
        sourceValueJson: value,
        sourceUpdatedAt: wine.updatedAt,
      });
      return [field, translation ?? undefined] as const;
    }),
  );

  return applyEnglishWineDetailTranslations(
    wine,
    Object.fromEntries(entries) as WineDetailTranslationValues,
  );
}
