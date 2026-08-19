import { db } from "@/lib/db";
import {
  grapeVarieties,
  regions,
  wineries,
  wineryEvents,
  wines,
  type ContentTranslationJson,
} from "@/lib/schema";
import { getAllJournalArticles } from "@/lib/journal";
import { WINERY_CATALOG } from "@/lib/winery-catalog";

export type TranslationSourceEntityType =
  | "wine"
  | "winery"
  | "winery_event"
  | "region"
  | "grape_variety"
  | "journal_article"
  | "winery_catalog";

export interface TranslationSourceCandidate {
  entityType: TranslationSourceEntityType;
  entityId: string;
  field: string;
  sourceLocale: "ro";
  targetLocale: "en";
  sourceValueJson: ContentTranslationJson;
  sourceUpdatedAt: string | null;
  protectedNames: string[];
}

interface CandidateInput {
  entityType: TranslationSourceEntityType;
  entityId: string | number;
  field: string;
  value: ContentTranslationJson | undefined;
  updatedAt?: string | null;
  protectedNames?: readonly string[];
}

function candidate(input: CandidateInput): TranslationSourceCandidate | null {
  if (input.value == null) return null;
  if (typeof input.value === "string" && input.value.trim().length === 0) {
    return null;
  }
  if (Array.isArray(input.value) && input.value.length === 0) return null;

  return {
    entityType: input.entityType,
    entityId: String(input.entityId),
    field: input.field,
    sourceLocale: "ro",
    targetLocale: "en",
    sourceValueJson: input.value,
    sourceUpdatedAt: input.updatedAt ?? null,
    protectedNames: [...(input.protectedNames ?? [])],
  };
}

function defined(
  value: TranslationSourceCandidate | null,
): value is TranslationSourceCandidate {
  return value !== null;
}

export async function collectDatabaseTranslationSources(): Promise<
  TranslationSourceCandidate[]
> {
  const [wineRows, wineryRows, eventRows, regionRows, grapeRows] =
    await Promise.all([
      db.select().from(wines),
      db.select().from(wineries),
      db.select().from(wineryEvents),
      db.select().from(regions),
      db.select().from(grapeVarieties),
    ]);
  const wineryNames = new Map(
    wineryRows.map((winery) => [winery.id, winery.name]),
  );

  const wineSources = wineRows.flatMap((wine) => {
    const protectedNames = [
      wine.name,
      wineryNames.get(wine.wineryId ?? -1) ?? "",
      ...wine.grapeVarieties.map((grape) => grape.name),
    ].filter(Boolean);
    const publicPairingNotes = wine.foodPairings
      .filter((pairing) => pairing.note?.trim())
      .map((pairing) => ({
        dishId: pairing.dishId ?? null,
        dish: pairing.dish,
        note: pairing.note?.trim() ?? "",
      }));

    return [
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "descriptionEditorial",
        value: wine.descriptionEditorial ?? undefined,
        updatedAt: wine.updatedAt,
        protectedNames,
      }),
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "valueExplanation",
        value: wine.valueExplanation ?? undefined,
        updatedAt: wine.updatedAt,
        protectedNames,
      }),
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "tasteProfile",
        value: wine.tasteProfile ?? undefined,
        updatedAt: wine.updatedAt,
        protectedNames,
      }),
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "thingsYouShouldKnow",
        value: wine.thingsYouShouldKnow,
        updatedAt: wine.updatedAt,
        protectedNames,
      }),
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "tastingNotes",
        value: wine.tastingNotes ?? undefined,
        updatedAt: wine.updatedAt,
        protectedNames,
      }),
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "imageAlt",
        value: wine.imageAlt ?? undefined,
        updatedAt: wine.updatedAt,
        protectedNames,
      }),
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "foodPairings",
        value: publicPairingNotes,
        updatedAt: wine.updatedAt,
        protectedNames: [
          ...protectedNames,
          ...publicPairingNotes.map((pairing) => pairing.dish),
        ],
      }),
      candidate({
        entityType: "wine",
        entityId: wine.id,
        field: "producerContent.culinaryPairings",
        value: wine.producerContent?.culinaryPairings ?? undefined,
        updatedAt: wine.updatedAt,
        protectedNames,
      }),
    ].filter(defined);
  });

  const winerySources = wineryRows.flatMap((winery) =>
    [
      candidate({
        entityType: "winery",
        entityId: winery.id,
        field: "description",
        value: winery.description ?? undefined,
        updatedAt: winery.updatedAt,
        protectedNames: [winery.name],
      }),
      candidate({
        entityType: "winery",
        entityId: winery.id,
        field: "customStory",
        value: winery.customStory ?? undefined,
        updatedAt: winery.updatedAt,
        protectedNames: [winery.name],
      }),
    ].filter(defined),
  );

  const eventSources = eventRows.flatMap((event) =>
    [
      candidate({
        entityType: "winery_event",
        entityId: event.id,
        field: "title",
        value: event.title,
        updatedAt: event.updatedAt,
      }),
      candidate({
        entityType: "winery_event",
        entityId: event.id,
        field: "description",
        value: event.description ?? undefined,
        updatedAt: event.updatedAt,
      }),
      candidate({
        entityType: "winery_event",
        entityId: event.id,
        field: "location",
        value: event.location ?? undefined,
        updatedAt: event.updatedAt,
      }),
    ].filter(defined),
  );

  const regionSources = regionRows
    .map((region) =>
      candidate({
        entityType: "region",
        entityId: region.id,
        field: "description",
        value: region.description ?? undefined,
        updatedAt: region.updatedAt,
        protectedNames: [region.name],
      }),
    )
    .filter(defined);

  const grapeSources = grapeRows
    .map((grape) =>
      candidate({
        entityType: "grape_variety",
        entityId: grape.id,
        field: "description",
        value: grape.description ?? undefined,
        updatedAt: grape.updatedAt,
        protectedNames: [grape.name],
      }),
    )
    .filter(defined);

  return [
    ...wineSources,
    ...winerySources,
    ...eventSources,
    ...regionSources,
    ...grapeSources,
  ];
}

export function collectStaticTranslationSources(): TranslationSourceCandidate[] {
  const journalSources = getAllJournalArticles().flatMap((article) =>
    [
      candidate({
        entityType: "journal_article",
        entityId: article.slug,
        field: "title",
        value: article.title,
      }),
      candidate({
        entityType: "journal_article",
        entityId: article.slug,
        field: "excerpt",
        value: article.excerpt,
      }),
      candidate({
        entityType: "journal_article",
        entityId: article.slug,
        field: "body",
        value: article.body,
      }),
    ].filter(defined),
  );

  const wineryCatalogSources = Object.entries(WINERY_CATALOG).flatMap(
    ([slug, enrichment]) => {
      if (!enrichment) return [];
      return [
        candidate({
          entityType: "winery_catalog",
          entityId: slug,
          field: "tagline",
          value: enrichment.tagline,
          protectedNames: [slug],
        }),
        candidate({
          entityType: "winery_catalog",
          entityId: slug,
          field: "story",
          value: enrichment.story,
          protectedNames: [slug],
        }),
      ].filter(defined);
    },
  );

  return [...journalSources, ...wineryCatalogSources];
}

export async function collectTranslationSources(): Promise<
  TranslationSourceCandidate[]
> {
  const databaseSources = await collectDatabaseTranslationSources();
  return [...databaseSources, ...collectStaticTranslationSources()];
}

