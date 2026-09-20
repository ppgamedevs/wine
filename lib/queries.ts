import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { grapeVarieties, regions, wineryEvents, wineries, wines } from "@/lib/schema";
import { andCatalog, catalogWineCondition, wineryHasCatalogWinesCondition } from "@/lib/wine-catalog";
import { GRAPE_GUIDES } from "@/lib/oenology";
import {
  catalogSearchIntent,
  grapeSearchHaystack,
  matchesCatalogSearch,
  searchCatalogHits,
  significantCatalogSearchTokens,
} from "@/lib/catalog-search";
import type { AppLocale } from "@/i18n/locale";
import { normalizeWineRow, normalizeWineRows } from "@/lib/normalize-wine";
import type { GrapeVarietyCatalogEntry } from "@/lib/grape-variety-index";
import { MIN_INDEXABLE_TOP_LIST_WINES } from "@/lib/top-lists";
import { MIN_RECOMMENDED_VALUE_SCORE } from "@/lib/value-score-thresholds";
import { VALUE_SCORE_EXCEPTIONAL_MIN } from "@/lib/value-score-thresholds";
import {
  MAX_PUBLIC_CATALOG_PAGE,
  WINE_CATALOG_PAGE_SIZE,
  WINERY_DIRECTORY_PAGE_SIZE,
  type PublicCatalogFacet,
  type PublicCatalogPage,
  type PublicWineCatalogFacets,
  type PublicWineCatalogFilters,
  type PublicWineCatalogRequest,
  type PublicWineryDirectoryRequest,
} from "@/lib/public-wine-card-types";
import type {
  Region,
  Winery,
  WineryEvent,
  WineryListItem,
  WineSweetness,
  WineType,
  WineryWithWines,
  WineWithRelations,
} from "@/types";

interface WineryWineSummaryRow {
  slug: string;
  name: string;
  valueScore: number | null;
  priceAvg: number | null;
  status: string;
  updatedAt: string;
  grapeVarieties: WineWithRelations["grapeVarieties"];
}

function mapWineryToListItem(
  base: Winery,
  region: Region | null,
  wineryWines: WineryWineSummaryRow[],
): WineryListItem {
  const visibleWines = wineryWines.filter((wine) => wine.status !== "rejected");

  const valueScores = visibleWines
    .map((w) => w.valueScore)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgValueScore =
    valueScores.length > 0
      ? Math.round(valueScores.reduce((a, b) => a + b, 0) / valueScores.length)
      : null;

  const prices = visibleWines
    .map((w) => w.priceAvg)
    .filter((p): p is number => p !== null && p !== undefined);
  const priceRange =
    prices.length > 0
      ? {
          min: Math.round(Math.min(...prices)),
          max: Math.round(Math.max(...prices)),
        }
      : null;

  const sortedByValue = [...visibleWines].sort(
    (a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0),
  );
  const bestWine = sortedByValue[0]
    ? {
        slug: sortedByValue[0].slug,
        name: sortedByValue[0].name,
        valueScore: sortedByValue[0].valueScore,
        priceAvg: sortedByValue[0].priceAvg,
      }
    : null;

  const under50 = visibleWines
    .filter((w) => w.priceAvg != null && w.priceAvg <= 50)
    .sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0))[0];
  const bestUnder50 = under50
    ? {
        slug: under50.slug,
        name: under50.name,
        valueScore: under50.valueScore,
        priceAvg: under50.priceAvg,
      }
    : null;

  const under100 = visibleWines
    .filter((w) => w.priceAvg != null && w.priceAvg <= 100)
    .sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0))[0];
  const bestUnder100 = under100
    ? {
        slug: under100.slug,
        name: under100.name,
        valueScore: under100.valueScore,
        priceAvg: under100.priceAvg,
      }
    : null;

  const grapeCounts = new Map<string, number>();
  for (const wine of visibleWines) {
    for (const grape of wine.grapeVarieties ?? []) {
      const label = grape.name ?? grape.slug;
      if (!label) continue;
      grapeCounts.set(label, (grapeCounts.get(label) ?? 0) + 1);
    }
  }
  const topGrapes = [...grapeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const lastPriceCheck =
    visibleWines
      .map((w) => w.updatedAt)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return {
    ...base,
    region,
    wineCount: visibleWines.length,
    avgValueScore,
    priceRange,
    bestWine,
    bestUnder50,
    bestUnder100,
    topGrapes,
    lastPriceCheck,
  };
}

export interface SearchSuggestion {
  type: "wine" | "winery" | "grape";
  name: string;
  slug: string;
  vintage?: number | null;
}

export interface CatalogSearchWinery {
  name: string;
  slug: string;
}

export interface CatalogSearchGrape {
  name: string;
  slug: string;
}

export interface CatalogSearchResult {
  wines: WineWithRelations[];
  wineries: CatalogSearchWinery[];
  grapes: CatalogSearchGrape[];
  query: string;
}

function likePattern(token: string): string {
  return `%${token.replace(/[%_]/g, "")}%`;
}

function wineMatchesSearchToken(
  token: string,
  options: { includeRegion?: boolean } = {},
): SQL {
  const pattern = likePattern(token);
  const includeRegion = options.includeRegion !== false;
  const filters: SQL[] = [
    like(wines.name, pattern),
    like(wines.slug, pattern),
    like(wines.grapeVarieties, pattern),
    inArray(
      wines.wineryId,
      db
        .select({ id: wineries.id })
        .from(wineries)
        .where(
          or(like(wineries.name, pattern), like(wineries.slug, pattern)),
        ),
    ),
  ];
  if (includeRegion) {
    filters.push(
      inArray(
        wines.regionId,
        db
          .select({ id: regions.id })
          .from(regions)
          .where(or(like(regions.name, pattern), like(regions.slug, pattern))),
      ),
    );
  }
  return or(...filters) as SQL;
}

function grapeCatalogEntries(locale: AppLocale = "ro") {
  return GRAPE_GUIDES.map((guide) => ({
    slug: guide.slug,
    name: guide.copy[locale].name,
    aliases: [
      ...guide.aliases,
      guide.copy.ro.name,
      guide.copy.en.name,
      ...guide.copy.ro.alsoKnownAs,
      ...guide.copy.en.alsoKnownAs,
    ],
  }));
}

/**
 * Full catalog search for the /cauta page (wines, wineries, grape varieties).
 */
export async function searchCatalog(
  query: string,
  limit = 24,
  locale: AppLocale = "ro",
): Promise<CatalogSearchResult> {
  const trimmed = query.trim();
  const tokens = significantCatalogSearchTokens(trimmed);

  if (tokens.length === 0) {
    return { wines: [], wineries: [], grapes: [], query: trimmed };
  }

  try {
    const [catalogWines, extraWineries] = await Promise.all([
      getWinesForSommelier(),
      db
        .select({ name: wineries.name, slug: wineries.slug })
        .from(wineries)
        .where(
          and(
            wineryHasCatalogWinesCondition(),
            or(
              ...tokens.flatMap((token) => [
                like(wineries.name, likePattern(token)),
                like(wineries.slug, likePattern(token)),
              ]),
            ),
          ),
        )
        .orderBy(asc(wineries.name))
        .limit(16),
    ]);
    const hits = searchCatalogHits(
      catalogWines,
      grapeCatalogEntries(locale),
      trimmed,
      { wineLimit: limit, wineryLimit: 8, grapeLimit: 8 },
      extraWineries,
    );
    const winesBySlug = new Map(
      catalogWines.map((wine) => [wine.slug, wine] as const),
    );

    return {
      wines: hits.wines
        .map((hit) => winesBySlug.get(hit.slug))
        .filter((wine): wine is WineWithRelations => wine != null),
      wineries: hits.wineries,
      grapes: hits.grapes,
      query: trimmed,
    };
  } catch (error) {
    console.error("searchCatalog failed", error);
    return { wines: [], wineries: [], grapes: [], query: trimmed };
  }
}

/**
 * Top wines for the homepage, ordered by value score. Joins winery + region.
 * Prag minim recomandare = 75/100.
 * Returns an empty array if the database is not yet provisioned.
 */
export async function getFeaturedWines(
  limit = 8,
): Promise<WineWithRelations[]> {
  try {
    const rows = await db.query.wines.findMany({
      with: { winery: true, region: true },
      where: and(
        catalogWineCondition(),
        gte(wines.valueScore, MIN_RECOMMENDED_VALUE_SCORE),
      ),
      orderBy: (table, { desc: orderDesc }) => [orderDesc(table.valueScore)],
      limit,
    });
    return normalizeWineRows(rows as WineWithRelations[]);
  } catch (error) {
    console.error("getFeaturedWines failed", error);
    return [];
  }
}

const CATALOG_WINE_TYPES: WineType[] = [
  "red",
  "white",
  "rose",
  "sparkling",
  "orange",
  "dessert",
];
const CATALOG_WINE_SWEETNESS: WineSweetness[] = [
  "sec",
  "demisec",
  "demidulce",
  "dulce",
];
const catalogPrice = sql<number | null>`coalesce(nullif(${wines.currentPrice}, 0), nullif(${wines.priceAvg}, 0))`;

function boundedPublicPage(page: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(
    Math.max(1, Math.trunc(page)),
    MAX_PUBLIC_CATALOG_PAGE,
  );
}

function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

function wineCatalogFilterCondition(
  filters: PublicWineCatalogFilters,
  omit: ReadonlyArray<"type" | "sweetness"> = [],
): SQL {
  const conditions: SQL[] = [catalogWineCondition()];

  const searchable = filters.query.replace(/[%_]/g, "").trim();
  if (searchable) {
    const pattern = `%${searchable}%`;
    conditions.push(
      or(
        like(wines.name, pattern),
        like(wines.grapeVarieties, pattern),
        inArray(
          wines.wineryId,
          db
            .select({ id: wineries.id })
            .from(wineries)
            .where(like(wineries.name, pattern)),
        ),
        inArray(
          wines.regionId,
          db
            .select({ id: regions.id })
            .from(regions)
            .where(like(regions.name, pattern)),
        ),
      ) as SQL,
    );
  }

  if (!omit.includes("type") && filters.type !== "all") {
    conditions.push(eq(wines.type, filters.type));
  }
  if (!omit.includes("sweetness") && filters.sweetness !== "all") {
    conditions.push(eq(wines.sweetness, filters.sweetness));
  }
  if (filters.verdict === "recommended") {
    conditions.push(gte(wines.valueScore, MIN_RECOMMENDED_VALUE_SCORE));
  } else if (filters.verdict === "exceptional") {
    conditions.push(gte(wines.valueScore, VALUE_SCORE_EXCEPTIONAL_MIN));
  }
  if (filters.priceBand === "under50") {
    conditions.push(lt(catalogPrice, 50));
  } else if (filters.priceBand === "50-100") {
    conditions.push(and(gte(catalogPrice, 50), lte(catalogPrice, 100)) as SQL);
  } else if (filters.priceBand === "over100") {
    conditions.push(gt(catalogPrice, 100));
  }

  return and(...conditions) as SQL;
}

function wineCatalogOrder(filters: PublicWineCatalogFilters): SQL[] {
  if (filters.sort === "price-asc") {
    return [
      sql`${catalogPrice} is null`,
      asc(catalogPrice),
      desc(wines.valueScore),
      asc(wines.name),
    ];
  }
  if (filters.sort === "price-desc") {
    return [
      sql`${catalogPrice} is null`,
      desc(catalogPrice),
      desc(wines.valueScore),
      asc(wines.name),
    ];
  }
  if (filters.sort === "name-asc") {
    return [asc(wines.name), asc(wines.slug)];
  }
  return [desc(wines.valueScore), asc(wines.name), asc(wines.slug)];
}

function facetMap<T extends string>(
  ids: readonly T[],
  rows: Array<{ id: T | null; total: number }>,
  allCount: number,
): Array<PublicCatalogFacet<"all" | T>> {
  const counts = new Map(
    rows
      .filter((row): row is { id: T; total: number } => row.id !== null)
      .map((row) => [row.id, row.total]),
  );
  return [
    { id: "all", count: allCount },
    ...ids.map((id) => ({ id, count: counts.get(id) ?? 0 })),
  ];
}

export interface CatalogWinePage extends PublicCatalogPage<WineWithRelations> {
  facets: PublicWineCatalogFacets;
}

/** Bounded verified catalog page. Page size is fixed and cannot be caller controlled. */
export async function getCatalogWinePage(
  request: PublicWineCatalogRequest,
): Promise<CatalogWinePage> {
  const requestedPage = boundedPublicPage(request.page);
  const empty: CatalogWinePage = {
    items: [],
    total: 0,
    page: 1,
    pageSize: WINE_CATALOG_PAGE_SIZE,
    totalPages: 1,
    facets: {
      types: facetMap(CATALOG_WINE_TYPES, [], 0),
      sweetness: facetMap(CATALOG_WINE_SWEETNESS, [], 0),
    },
  };

  try {
    const mainCondition = wineCatalogFilterCondition(request.filters);
    const typeCondition = wineCatalogFilterCondition(request.filters, ["type"]);
    const sweetnessCondition = wineCatalogFilterCondition(request.filters, [
      "sweetness",
    ]);
    const [totalRow] = await db
      .select({ total: count() })
      .from(wines)
      .where(mainCondition);
    const total = totalRow?.total ?? 0;
    const pageCount = totalPages(total, WINE_CATALOG_PAGE_SIZE);
    const page = Math.min(requestedPage, pageCount);

    const [rows, typeRows, sweetnessRows, typeTotalRow, sweetnessTotalRow] =
      await Promise.all([
        db.query.wines.findMany({
          with: { winery: true, region: true },
          where: mainCondition,
          orderBy: wineCatalogOrder(request.filters),
          limit: WINE_CATALOG_PAGE_SIZE,
          offset: (page - 1) * WINE_CATALOG_PAGE_SIZE,
        }),
        db
          .select({ id: wines.type, total: count() })
          .from(wines)
          .where(typeCondition)
          .groupBy(wines.type),
        db
          .select({ id: wines.sweetness, total: count() })
          .from(wines)
          .where(sweetnessCondition)
          .groupBy(wines.sweetness),
        db
          .select({ total: count() })
          .from(wines)
          .where(typeCondition),
        db
          .select({ total: count() })
          .from(wines)
          .where(sweetnessCondition),
      ]);

    return {
      items: normalizeWineRows(rows as WineWithRelations[]),
      total,
      page,
      pageSize: WINE_CATALOG_PAGE_SIZE,
      totalPages: pageCount,
      facets: {
        types: facetMap(
          CATALOG_WINE_TYPES,
          typeRows,
          typeTotalRow[0]?.total ?? 0,
        ),
        sweetness: facetMap(
          CATALOG_WINE_SWEETNESS,
          sweetnessRows,
          sweetnessTotalRow[0]?.total ?? 0,
        ),
      },
    };
  } catch (error) {
    console.error("getCatalogWinePage failed", error);
    return empty;
  }
}

export async function getAllWineSlugs(): Promise<{ slug: string }[]> {
  try {
    return await db
      .select({ slug: wines.slug })
      .from(wines)
      .where(catalogWineCondition());
  } catch (error) {
    console.error("getAllWineSlugs failed", error);
    return [];
  }
}

export async function getWineSitemapEntries(): Promise<
  { slug: string; updatedAt: string }[]
> {
  try {
    return await db
      .select({ slug: wines.slug, updatedAt: wines.updatedAt })
      .from(wines)
      .where(catalogWineCondition());
  } catch (error) {
    console.error("getWineSitemapEntries failed", error);
    return [];
  }
}

function wineryDirectoryCondition(query: string): SQL {
  const searchable = query.replace(/[%_]/g, "").trim();
  if (!searchable) return wineryHasCatalogWinesCondition();
  const pattern = `%${searchable}%`;

  return and(
    wineryHasCatalogWinesCondition(),
    or(
      like(wineries.name, pattern),
      inArray(
        wineries.regionId,
        db
          .select({ id: regions.id })
          .from(regions)
          .where(like(regions.name, pattern)),
      ),
    ),
  ) as SQL;
}

export type WineryDirectoryPage = PublicCatalogPage<WineryListItem>;

/**
 * Bounded public winery directory ordered alphabetically. Page size is fixed
 * and cannot be caller controlled.
 */
export async function getWineryDirectoryPage(
  request: PublicWineryDirectoryRequest,
): Promise<WineryDirectoryPage> {
  const requestedPage = boundedPublicPage(request.page);
  const empty: WineryDirectoryPage = {
    items: [],
    total: 0,
    page: 1,
    pageSize: WINERY_DIRECTORY_PAGE_SIZE,
    totalPages: 1,
  };

  try {
    const condition = wineryDirectoryCondition(request.query);
    const [totalRow] = await db
      .select({ total: count() })
      .from(wineries)
      .where(condition);
    const total = totalRow?.total ?? 0;
    const pageCount = totalPages(total, WINERY_DIRECTORY_PAGE_SIZE);
    const page = Math.min(requestedPage, pageCount);
    const rows = await db.query.wineries.findMany({
      where: condition,
      with: {
        region: true,
        wines: {
          columns: {
            slug: true,
            name: true,
            valueScore: true,
            priceAvg: true,
            status: true,
            updatedAt: true,
            grapeVarieties: true,
          },
          where: catalogWineCondition(),
        },
      },
      orderBy: () => [asc(wineries.name), asc(wineries.slug)],
      limit: WINERY_DIRECTORY_PAGE_SIZE,
      offset: (page - 1) * WINERY_DIRECTORY_PAGE_SIZE,
    });

    return {
      items: rows.map((row) => {
        const { wines: wineryWines, region, ...base } = row;
        return mapWineryToListItem(base, region ?? null, wineryWines);
      }),
      total,
      page,
      pageSize: WINERY_DIRECTORY_PAGE_SIZE,
      totalPages: pageCount,
    };
  } catch (error) {
    console.error("getWineryDirectoryPage failed", error);
    return empty;
  }
}

export async function getAllWinerySlugs(): Promise<{ slug: string }[]> {
  try {
    return await db.select({ slug: wineries.slug }).from(wineries);
  } catch (error) {
    console.error("getAllWinerySlugs failed", error);
    return [];
  }
}

export async function getWinerySitemapEntries(): Promise<
  { slug: string; updatedAt: string }[]
> {
  try {
    const rows = await db.query.wineries.findMany({
      columns: { slug: true, updatedAt: true },
      with: {
        wines: {
          columns: { id: true },
          where: (wine, { ne }) => ne(wine.status, "rejected"),
          limit: 1,
        },
      },
    });

    // Wineries with zero wines are noindexed on-page; keep the sitemap in sync.
    return rows
      .filter((row) => row.wines.length > 0)
      .map((row) => ({ slug: row.slug, updatedAt: row.updatedAt }));
  } catch (error) {
    console.error("getWinerySitemapEntries failed", error);
    return [];
  }
}

export async function getWineryBySlug(
  slug: string,
): Promise<WineryWithWines | null> {
  try {
    const winery = await db.query.wineries.findFirst({
      where: eq(wineries.slug, slug),
      with: {
        region: true,
        wines: {
          with: { region: true },
          orderBy: (table, { desc: orderDesc }) => [
            orderDesc(table.valueScore),
          ],
        },
      },
    });

    if (!winery) return null;

    // Attach the parent winery onto each wine so WineCard has full relations.
    const { wines: wineryWines, ...wineryBase } = winery;
    const winesWithRelations = wineryWines
      .filter((wine) => wine.status !== "rejected")
      .map((wine) => ({
      ...wine,
      winery: wineryBase,
      region: wine.region ?? null,
    })) as WineWithRelations[];

    return {
      ...wineryBase,
      region: winery.region ?? null,
      wines: winesWithRelations,
    } as WineryWithWines;
  } catch (error) {
    console.error("getWineryBySlug failed", error);
    return null;
  }
}

export async function getWineryPublishedEvents(
  wineryId: number,
): Promise<WineryEvent[]> {
  try {
    return await db.query.wineryEvents.findMany({
      where: and(
        eq(wineryEvents.wineryId, wineryId),
        eq(wineryEvents.isPublished, true),
      ),
      orderBy: [asc(wineryEvents.startsAt)],
      limit: 24,
    });
  } catch (error) {
    console.error("getWineryPublishedEvents failed", error);
    return [];
  }
}

export async function getAllWineries(): Promise<
  { id: number; name: string; slug: string }[]
> {
  try {
    return await db
      .select({ id: wineries.id, name: wineries.name, slug: wineries.slug })
      .from(wineries)
      .orderBy(wineries.name);
  } catch (error) {
    console.error("getAllWineries failed", error);
    return [];
  }
}

export async function getGrapeVarietySlugs(): Promise<string[]> {
  const entries = await getGrapeVarietyCatalogEntries();
  return entries.map((entry) => entry.slug);
}

export async function getGrapeVarietyCatalogEntries(): Promise<
  GrapeVarietyCatalogEntry[]
> {
  try {
    const rows = await db
      .select({
        id: grapeVarieties.id,
        slug: grapeVarieties.slug,
        name: grapeVarieties.name,
        description: grapeVarieties.description,
        updatedAt: grapeVarieties.updatedAt,
      })
      .from(grapeVarieties);
    return rows;
  } catch (error) {
    console.error("getGrapeVarietyCatalogEntries failed", error);
    return [];
  }
}

export async function getWinesForSommelier(): Promise<WineWithRelations[]> {
  try {
    const rows = await db.query.wines.findMany({
      with: { winery: true, region: true },
      where: catalogWineCondition(),
    });
    return normalizeWineRows(rows as WineWithRelations[]);
  } catch (error) {
    console.error("getWinesForSommelier failed", error);
    return [];
  }
}

export async function getWineryWineCount(wineryId: number): Promise<number> {
  try {
    const [row] = await db
      .select({ total: count() })
      .from(wines)
      .where(and(eq(wines.wineryId, wineryId), catalogWineCondition()));

    return row?.total ?? 0;
  } catch (error) {
    console.error("getWineryWineCount failed", error);
    return 0;
  }
}

export async function getWineBySlug(
  slug: string,
): Promise<WineWithRelations | null> {
  try {
    const wine = await db.query.wines.findFirst({
      where: and(eq(wines.slug, slug), catalogWineCondition()),
      with: { winery: true, region: true },
    });
    return (wine ? normalizeWineRow(wine as WineWithRelations) : null);
  } catch (error) {
    console.error("getWineBySlug failed", { slug, error });
    return null;
  }
}

export async function getSimilarWines(
  wine: WineWithRelations,
  limit = 4,
): Promise<WineWithRelations[]> {
  try {
    const rows = await db.query.wines.findMany({
      where: andCatalog(
        ne(wines.id, wine.id),
        or(
          eq(wines.wineryId, wine.wineryId ?? -1),
          and(
            eq(wines.regionId, wine.regionId ?? -1),
            eq(wines.type, wine.type),
          ),
        ),
      ),
      with: { winery: true, region: true },
      orderBy: (table, { desc: orderDesc }) => [orderDesc(table.valueScore)],
      limit,
    });
    return normalizeWineRows(rows as WineWithRelations[]);
  } catch (error) {
    console.error("getSimilarWines failed", error);
    return [];
  }
}

export async function getRecommendedWines(
  wine: WineWithRelations,
  limit = 4,
): Promise<WineWithRelations[]> {
  try {
    const minPrice = wine.priceAvg ? wine.priceAvg * 0.7 : 0;
    const maxPrice = wine.priceAvg ? wine.priceAvg * 1.3 : 9999;

    const rows = await db.query.wines.findMany({
      where: andCatalog(
        ne(wines.id, wine.id),
        eq(wines.type, wine.type),
        gte(wines.valueScore, MIN_RECOMMENDED_VALUE_SCORE),
      ),
      with: { winery: true, region: true },
      orderBy: (table, { desc: orderDesc }) => [orderDesc(table.valueScore)],
      limit: limit + 6,
    });

    const filtered = normalizeWineRows(rows as WineWithRelations[])
      .filter((row) => {
        if (!row.priceAvg || !wine.priceAvg) return true;
        return row.priceAvg >= minPrice && row.priceAvg <= maxPrice;
      })
      .slice(0, limit);

    return filtered.length > 0
      ? filtered
      : normalizeWineRows((rows as WineWithRelations[]).slice(0, limit));
  } catch (error) {
    console.error("getRecommendedWines failed", error);
    return [];
  }
}

/**
 * Lightweight autocomplete over wines, wineries, and grape varieties.
 */
export async function getSearchSuggestions(
  query: string,
  limit = 6,
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const tokens = significantCatalogSearchTokens(trimmed);
  if (tokens.length === 0) return [];

  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 6;
  const cappedLimit = Math.max(1, Math.min(normalizedLimit, 8));
  const leadToken = tokens[0];
  if (!leadToken) return [];
  const includeRegion = catalogSearchIntent(trimmed) !== "winery";
  const grapePool = grapeCatalogEntries();
  const grapeMatches = grapePool.filter((grape) =>
    matchesCatalogSearch(grapeSearchHaystack(grape), tokens),
  );
  const grapeWineFilters = grapeMatches.map((grape) =>
    like(wines.grapeVarieties, likePattern(grape.slug)),
  );

  try {
    const [wineRows, wineryRows] = await Promise.all([
      db.query.wines.findMany({
        with: { winery: true, region: true },
        where: and(
          catalogWineCondition(),
          grapeWineFilters.length > 0
            ? or(
                wineMatchesSearchToken(leadToken, { includeRegion }),
                ...grapeWineFilters,
              )
            : wineMatchesSearchToken(leadToken, { includeRegion }),
        ),
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.valueScore)],
        limit: cappedLimit * 6,
      }),
      db
        .select({
          id: wineries.id,
          name: wineries.name,
          slug: wineries.slug,
        })
        .from(wineries)
        .where(
          and(
            wineryHasCatalogWinesCondition(),
            or(
              like(wineries.name, likePattern(leadToken)),
              like(wineries.slug, likePattern(leadToken)),
            ),
          ),
        )
        .orderBy(asc(wineries.name))
        .limit(cappedLimit * 2),
    ]);

    const producerWines =
      wineryRows.length === 0
        ? []
        : await db.query.wines.findMany({
            with: { winery: true, region: true },
            where: and(
              catalogWineCondition(),
              inArray(
                wines.wineryId,
                wineryRows.map((winery) => winery.id),
              ),
            ),
            orderBy: (table, { desc: orderDesc }) => [
              orderDesc(table.valueScore),
            ],
            limit: cappedLimit * 4,
          });

    const winesBySlug = new Map<string, WineWithRelations>();
    for (const row of [...wineRows, ...producerWines] as WineWithRelations[]) {
      if (!winesBySlug.has(row.slug)) winesBySlug.set(row.slug, row);
    }

    const hits = searchCatalogHits(
      normalizeWineRows([...winesBySlug.values()]),
      grapePool,
      trimmed,
      {
        wineLimit: cappedLimit,
        wineryLimit: cappedLimit,
        grapeLimit: cappedLimit,
      },
      wineryRows.map((winery) => ({ name: winery.name, slug: winery.slug })),
    );

    const suggestions: SearchSuggestion[] = [
      ...hits.wineries.map((winery) => ({
        type: "winery" as const,
        name: winery.name,
        slug: winery.slug,
      })),
      ...hits.grapes.map((grape) => ({
        type: "grape" as const,
        name: grape.name,
        slug: grape.slug,
      })),
      ...hits.wines.map((wine) => ({
        type: "wine" as const,
        name: wine.name,
        slug: wine.slug,
      })),
    ];

    return suggestions.slice(0, cappedLimit);
  } catch (error) {
    console.error("getSearchSuggestions failed", error);
    return [];
  }
}

export interface RegionHubData {
  region: Region;
  wineries: WineryListItem[];
  wines: WineWithRelations[];
}

export async function getAllRegionSlugs(): Promise<{ slug: string }[]> {
  try {
    const rows = await db
      .select({ slug: regions.slug })
      .from(regions)
      .orderBy(asc(regions.name));
    return rows;
  } catch (error) {
    console.error("getAllRegionSlugs failed", error);
    return [];
  }
}

/**
 * Regiuni featured pe hub-ul /regiuni. Filtram la
 * regiuni indexabile (>= MIN_INDEXABLE_TOP_LIST_WINES vinuri verificate), altfel
 * am afisa carduri catre pagini /regiuni/[slug] care dau notFound() - o regiune
 * nou creata (fara vinuri legate inca) nu are voie sa arate ca fiind "explorabila".
 */
export async function getFeaturedRegions(
  limit = 6,
  minWines = MIN_INDEXABLE_TOP_LIST_WINES,
): Promise<Region[]> {
  try {
    const wineCount = count(wines.id);
    const rows = await db
      .select({
        id: regions.id,
        slug: regions.slug,
        name: regions.name,
        country: regions.country,
        description: regions.description,
        imageUrl: regions.imageUrl,
        createdAt: regions.createdAt,
        updatedAt: regions.updatedAt,
      })
      .from(regions)
      .innerJoin(wines, and(eq(wines.regionId, regions.id), catalogWineCondition()))
      .groupBy(regions.id)
      .having(gte(wineCount, minWines))
      .orderBy(desc(wineCount), asc(regions.name))
      .limit(limit);
    return rows;
  } catch (error) {
    console.error("getFeaturedRegions failed", error);
    return [];
  }
}

export interface RegionDirectoryItem {
  slug: string;
  name: string;
  description: string | null;
  wineCount: number;
  wineryCount: number;
}

export async function getRegionDirectory(): Promise<RegionDirectoryItem[]> {
  try {
    const wineCount = count(wines.id);
    const rows = await db
      .select({
        slug: regions.slug,
        name: regions.name,
        description: regions.description,
        wineCount,
        wineryCount: sql<number>`count(distinct ${wines.wineryId})`.mapWith(
          Number,
        ),
      })
      .from(regions)
      .innerJoin(
        wines,
        and(eq(wines.regionId, regions.id), catalogWineCondition()),
      )
      .groupBy(regions.id, regions.slug, regions.name, regions.description)
      .having(gte(wineCount, MIN_INDEXABLE_TOP_LIST_WINES))
      .orderBy(desc(wineCount), asc(regions.name));
    return rows;
  } catch (error) {
    console.error("getRegionDirectory failed", error);
    return [];
  }
}

export async function getRegionBySlug(slug: string): Promise<Region | null> {
  try {
    const row = await db.query.regions.findFirst({
      where: eq(regions.slug, slug),
    });
    return row ?? null;
  } catch (error) {
    console.error("getRegionBySlug failed", error);
    return null;
  }
}

export async function getRegionHubData(slug: string): Promise<RegionHubData | null> {
  const region = await getRegionBySlug(slug);
  if (!region) return null;

  try {
    const [wineryRows, wineRows] = await Promise.all([
      db.query.wineries.findMany({
        where: eq(wineries.regionId, region.id),
        with: {
          region: true,
          wines: {
            columns: {
              slug: true,
              name: true,
              valueScore: true,
              priceAvg: true,
              status: true,
              updatedAt: true,
              grapeVarieties: true,
            },
          },
        },
        orderBy: () => [asc(wineries.name)],
      }),
      db.query.wines.findMany({
        where: and(eq(wines.regionId, region.id), catalogWineCondition()),
        with: { winery: true, region: true },
        orderBy: () => [desc(wines.valueScore)],
        limit: 20,
      }),
    ]);

    const mappedWineries: WineryListItem[] = wineryRows
      .map((row) => {
        const { wines: wineryWines, region: wRegion, ...base } = row;
        const item = mapWineryToListItem(base, wRegion ?? null, wineryWines);
        return item.wineCount > 0 ? item : null;
      })
      .filter((w): w is WineryListItem => w !== null);

    return {
      region,
      wineries: mappedWineries,
      wines: normalizeWineRows(wineRows),
    };
  } catch (error) {
    console.error("getRegionHubData failed", error);
    return null;
  }
}

export async function getIndexableRegionSlugs(
  minWines = 8,
): Promise<string[]> {
  const slugs = await getAllRegionSlugs();
  const indexable: string[] = [];

  for (const { slug } of slugs) {
    const hub = await getRegionHubData(slug);
    if (hub && hub.wines.length >= minWines) {
      indexable.push(slug);
    }
  }

  return indexable;
}
