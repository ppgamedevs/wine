import { OCCASIONS, type OccasionId } from "@/lib/sommelier";
import {
  BUDGET_THRESHOLDS,
  getResolvableTopListSlugs,
  resolveTopList,
  TYPE_SLUG_MAP,
  WINE_TYPE_TO_TOP_SLUG,
  type ResolvedTopList,
} from "@/lib/top-lists";
import type { WineType, WineWithRelations } from "@/types";

export const TOP_LIST_LOCALES = ["ro", "en"] as const;
export type TopListLocale = (typeof TOP_LIST_LOCALES)[number];

const CURATED_TOP_LISTS = [
  {
    key: "best-romanian-wines",
    roSlug: "cele-mai-bune-vinuri-romanesti",
    enSlug: "best-romanian-wines",
  },
  {
    key: "best-wines-for-gifts",
    roSlug: "vinuri-cadou",
    enSlug: "best-wines-for-gifts",
  },
  {
    key: "best-supermarket-wines",
    roSlug: "vinuri-bune-din-supermarket",
    enSlug: "best-supermarket-wines",
  },
] as const;

export type CuratedTopListKey = (typeof CURATED_TOP_LISTS)[number]["key"];
export type TopListOccasionId = Exclude<OccasionId, "oricare">;

const TOP_LIST_OCCASIONS: TopListOccasionId[] = OCCASIONS.map(
  ({ id }) => id,
).filter((id): id is TopListOccasionId => id !== "oricare");

const ENGLISH_OCCASION_SLUGS = {
  nunta: "weddings",
  cadou: "gifts",
  "cadou-business": "business-gifts",
  "cina-romantica": "romantic-dinners",
  sarmale: "sarmale",
  gratar: "barbecues",
  petrecere: "parties",
  sarbatori: "holidays",
  "pentru-desert": "desserts",
} as const satisfies Readonly<Record<TopListOccasionId, string>>;

const ENGLISH_TYPE_SLUGS = {
  red: "red",
  white: "white",
  rose: "rose",
  sparkling: "sparkling",
  dessert: "dessert",
  orange: "orange",
} as const satisfies Readonly<Record<WineType, string>>;

export interface CuratedTopListDefinition {
  readonly kind: "curated";
  readonly id: `curated:${CuratedTopListKey}`;
  readonly key: CuratedTopListKey;
}

export interface TypeTopListDefinition {
  readonly kind: "type";
  readonly id: `type:${WineType}`;
  readonly wineType: WineType;
}

export interface BudgetTopListDefinition {
  readonly kind: "budget";
  readonly id: `budget:${number}`;
  readonly budget: number;
}

export interface BudgetOccasionTopListDefinition {
  readonly kind: "budget-occasion";
  readonly id: `budget-occasion:${number}:${TopListOccasionId}`;
  readonly budget: number;
  readonly occasion: TopListOccasionId;
}

export interface GrapeTopListDefinition {
  readonly kind: "grape";
  readonly id: `grape:${string}`;
  readonly grapeSlug: string;
}

export type TopListDefinition =
  | CuratedTopListDefinition
  | TypeTopListDefinition
  | BudgetTopListDefinition
  | BudgetOccasionTopListDefinition
  | GrapeTopListDefinition;

export type TopListCanonicalId = TopListDefinition["id"];

export interface LocalizedTopListRoute {
  readonly canonicalId: TopListCanonicalId;
  readonly definition: TopListDefinition;
  readonly roSlug: string;
  readonly enSlug: string;
}

export interface ResolvedLocalizedTopListRoute extends LocalizedTopListRoute {
  readonly list: ResolvedTopList;
  readonly rankedWineIds: readonly number[];
}

function curatedDefinition(
  key: CuratedTopListKey,
): CuratedTopListDefinition {
  return {
    kind: "curated",
    id: `curated:${key}`,
    key,
  };
}

function typeDefinition(wineType: WineType): TypeTopListDefinition {
  return {
    kind: "type",
    id: `type:${wineType}`,
    wineType,
  };
}

function budgetDefinition(budget: number): BudgetTopListDefinition {
  return {
    kind: "budget",
    id: `budget:${budget}`,
    budget,
  };
}

function budgetOccasionDefinition(
  budget: number,
  occasion: TopListOccasionId,
): BudgetOccasionTopListDefinition {
  return {
    kind: "budget-occasion",
    id: `budget-occasion:${budget}:${occasion}`,
    budget,
    occasion,
  };
}

function grapeDefinition(grapeSlug: string): GrapeTopListDefinition {
  return {
    kind: "grape",
    id: `grape:${grapeSlug}`,
    grapeSlug,
  };
}

function uniqueGrapeSlugs(grapeSlugs: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const grapeSlug of grapeSlugs) {
    if (grapeSlug.length === 0 || seen.has(grapeSlug)) continue;
    seen.add(grapeSlug);
    unique.push(grapeSlug);
  }

  return unique;
}

export function buildTopListDefinitions(
  grapeSlugs: readonly string[] = [],
): TopListDefinition[] {
  const curated = CURATED_TOP_LISTS.map(({ key }) => curatedDefinition(key));
  const types = Object.values(TYPE_SLUG_MAP).map(typeDefinition);
  const budgets = BUDGET_THRESHOLDS.map(budgetDefinition);
  const combinations = BUDGET_THRESHOLDS.flatMap((budget) =>
    TOP_LIST_OCCASIONS.map((occasion) =>
      budgetOccasionDefinition(budget, occasion),
    ),
  );
  const grapes = uniqueGrapeSlugs(grapeSlugs).map(grapeDefinition);

  return [...curated, ...types, ...budgets, ...combinations, ...grapes];
}

export function topListSlugForLocale(
  definition: TopListDefinition,
  locale: TopListLocale,
): string {
  switch (definition.kind) {
    case "curated": {
      const curated = CURATED_TOP_LISTS.find(
        ({ key }) => key === definition.key,
      );
      if (!curated) {
        throw new Error(`Unknown curated top-list ID: ${definition.id}`);
      }
      return locale === "ro" ? curated.roSlug : curated.enSlug;
    }
    case "type":
      return locale === "ro"
        ? `vinuri-${WINE_TYPE_TO_TOP_SLUG[definition.wineType]}`
        : `best-${ENGLISH_TYPE_SLUGS[definition.wineType]}-wines`;
    case "budget":
      return locale === "ro"
        ? `vinuri-sub-${definition.budget}-lei`
        : `wines-under-${definition.budget}-ron`;
    case "budget-occasion":
      return locale === "ro"
        ? `vinuri-sub-${definition.budget}-lei-pentru-${definition.occasion}`
        : `wines-under-${definition.budget}-ron-for-${ENGLISH_OCCASION_SLUGS[definition.occasion]}`;
    case "grape":
      return locale === "ro"
        ? `cele-mai-bune-${definition.grapeSlug}`
        : `best-${definition.grapeSlug}-wines`;
  }
}

function localizedRoute(
  definition: TopListDefinition,
): LocalizedTopListRoute {
  return {
    canonicalId: definition.id,
    definition,
    roSlug: topListSlugForLocale(definition, "ro"),
    enSlug: topListSlugForLocale(definition, "en"),
  };
}

export function buildLocalizedTopListRoutes(
  grapeSlugs: readonly string[] = [],
): LocalizedTopListRoute[] {
  return buildTopListDefinitions(grapeSlugs).map(localizedRoute);
}

export function resolveTopListDefinitionById(
  canonicalId: string,
  grapeSlugs: readonly string[] = [],
): TopListDefinition | null {
  return (
    buildTopListDefinitions(grapeSlugs).find(
      ({ id }) => id === canonicalId,
    ) ?? null
  );
}

export function resolveTopListDefinition(
  slug: string,
  locale: TopListLocale,
  grapeSlugs: readonly string[] = [],
): TopListDefinition | null {
  for (const definition of buildTopListDefinitions(grapeSlugs)) {
    if (topListSlugForLocale(definition, locale) === slug) {
      return definition;
    }
  }

  return null;
}

function inferGrapeDefinition(
  slug: string,
  locale: TopListLocale,
): GrapeTopListDefinition | null {
  const match =
    locale === "ro"
      ? slug.match(/^cele-mai-bune-(.+)$/)
      : slug.match(/^best-(.+)-wines$/);
  return match?.[1] ? grapeDefinition(match[1]) : null;
}

export function resolveTopListDefinitionFromEitherLocale(
  slug: string,
  grapeSlugs: readonly string[] = [],
): TopListDefinition | null {
  return (
    resolveTopListDefinition(slug, "ro", grapeSlugs) ??
    resolveTopListDefinition(slug, "en", grapeSlugs)
  );
}

export function mapRomanianTopListSlugToEnglish(
  roSlug: string,
  grapeSlugs: readonly string[] = [],
): string | null {
  const definition =
    resolveTopListDefinition(roSlug, "ro", grapeSlugs) ??
    inferGrapeDefinition(roSlug, "ro");
  return definition ? topListSlugForLocale(definition, "en") : null;
}

export function mapEnglishTopListSlugToRomanian(
  enSlug: string,
  grapeSlugs: readonly string[] = [],
): string | null {
  const definition =
    resolveTopListDefinition(enSlug, "en", grapeSlugs) ??
    inferGrapeDefinition(enSlug, "en");
  return definition ? topListSlugForLocale(definition, "ro") : null;
}

function resolveDefinitionAgainstRomanianRanking(
  definition: TopListDefinition,
  allWines: WineWithRelations[],
): ResolvedLocalizedTopListRoute | null {
  const route = localizedRoute(definition);
  const list = resolveTopList(route.roSlug, allWines);
  if (!list) return null;

  return {
    ...route,
    list,
    rankedWineIds: list.wines.map(({ id }) => id),
  };
}

export function resolveLocalizedTopListRoute(
  slug: string,
  locale: TopListLocale,
  allWines: WineWithRelations[],
  grapeSlugs: readonly string[] = [],
): ResolvedLocalizedTopListRoute | null {
  const definition = resolveTopListDefinition(slug, locale, grapeSlugs);
  return definition
    ? resolveDefinitionAgainstRomanianRanking(definition, allWines)
    : null;
}

export function mapResolvableRomanianTopListSlugToEnglish(
  roSlug: string,
  allWines: WineWithRelations[],
  grapeSlugs: readonly string[] = [],
): ResolvedLocalizedTopListRoute | null {
  const definition = resolveTopListDefinition(roSlug, "ro", grapeSlugs);
  return definition
    ? resolveDefinitionAgainstRomanianRanking(definition, allWines)
    : null;
}

export function mapResolvableRomanianTopListSlugsToEnglish(
  roSlugs: readonly string[],
  allWines: WineWithRelations[],
  grapeSlugs: readonly string[] = [],
): ResolvedLocalizedTopListRoute[] {
  return roSlugs.flatMap((roSlug) => {
    const mapped = mapResolvableRomanianTopListSlugToEnglish(
      roSlug,
      allWines,
      grapeSlugs,
    );
    return mapped ? [mapped] : [];
  });
}

export function getLocalizedResolvableTopListRoutes(
  allWines: WineWithRelations[],
  grapeSlugs: readonly string[] = [],
): ResolvedLocalizedTopListRoute[] {
  const resolvableRomanianSlugs = getResolvableTopListSlugs(
    allWines,
    [...grapeSlugs],
  );
  return mapResolvableRomanianTopListSlugsToEnglish(
    resolvableRomanianSlugs,
    allWines,
    grapeSlugs,
  );
}
