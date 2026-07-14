import "server-only";
import { and, asc, count, desc, eq, gte, like, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { grapeVarieties, regions, wineryEvents, wineries, wines } from "@/lib/schema";
import { andCatalog, catalogWineCondition } from "@/lib/wine-catalog";
import { normalizeWineRow, normalizeWineRows } from "@/lib/normalize-wine";
import { MIN_INDEXABLE_TOP_LIST_WINES } from "@/lib/top-lists";
import { MIN_RECOMMENDED_VALUE_SCORE } from "@/lib/value-score-thresholds";
import type {
  Region,
  Winery,
  WineryEvent,
  WineryListItem,
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
  type: "wine" | "winery";
  name: string;
  slug: string;
  vintage?: number | null;
}

export interface CatalogSearchWinery {
  name: string;
  slug: string;
}

export interface CatalogSearchResult {
  wines: WineWithRelations[];
  wineries: CatalogSearchWinery[];
  query: string;
}

function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function searchTokens(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function matchesSearchTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const normalized = normalizeSearchText(haystack);
  return tokens.every((token) => normalized.includes(token));
}

/**
 * Full catalog search for the /cauta page (wines + wineries).
 */
export async function searchCatalog(
  query: string,
  limit = 24,
): Promise<CatalogSearchResult> {
  const trimmed = query.trim();
  const tokens = searchTokens(trimmed);

  if (tokens.length === 0) {
    return { wines: [], wineries: [], query: trimmed };
  }

  const pattern = `%${trimmed.replace(/\s+/g, "%")}%`;

  try {
    const [wineRows, wineryRows] = await Promise.all([
      db.query.wines.findMany({
        with: { winery: true, region: true },
        where: and(catalogWineCondition(), like(wines.name, pattern)),
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.valueScore)],
        limit: limit * 2,
      }),
      db.query.wineries.findMany({
        where: like(wineries.name, pattern),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.name)],
        limit: 12,
      }),
    ]);

    const normalizedWines = normalizeWineRows(wineRows as WineWithRelations[]);
    const matchedWines = normalizedWines
      .filter((wine) =>
        matchesSearchTokens(
          [
            wine.name,
            wine.winery?.name ?? "",
            wine.region?.name ?? "",
            wine.grapeVarieties.map((grape) => grape.name).join(" "),
          ].join(" "),
          tokens,
        ),
      )
      .slice(0, limit);

    const matchedWineries = wineryRows
      .filter((winery) => matchesSearchTokens(winery.name, tokens))
      .slice(0, 8)
      .map((winery) => ({
        name: winery.name,
        slug: winery.slug,
      }));

    return {
      wines: matchedWines,
      wineries: matchedWineries,
      query: trimmed,
    };
  } catch (error) {
    console.error("searchCatalog failed", error);
    return { wines: [], wineries: [], query: trimmed };
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

/** Full verified catalog for listing pages, ordered by Value Score. */
export async function getCatalogWines(): Promise<WineWithRelations[]> {
  try {
    const rows = await db.query.wines.findMany({
      with: { winery: true, region: true },
      where: catalogWineCondition(),
      orderBy: (table, { desc: orderDesc, asc: orderAsc }) => [
        orderDesc(table.valueScore),
        orderAsc(table.name),
      ],
    });
    return normalizeWineRows(rows as WineWithRelations[]);
  } catch (error) {
    console.error("getCatalogWines failed", error);
    return [];
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

/**
 * All wineries for the index page, ordered alphabetically, with region and
 * aggregated wine stats (count, average value score, price range).
 */
export async function getWineriesIndex(): Promise<WineryListItem[]> {
  try {
    const rows = await db.query.wineries.findMany({
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
    });

    return rows
      .map((row) => {
        const { wines: wineryWines, region, ...base } = row;
        return mapWineryToListItem(base, region ?? null, wineryWines);
      })
      .filter((winery) => winery.wineCount > 0);
  } catch (error) {
    console.error("getWineriesIndex failed", error);
    return [];
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
  try {
    const rows = await db
      .select({ slug: grapeVarieties.slug })
      .from(grapeVarieties);
    return rows.map((row) => row.slug);
  } catch (error) {
    console.error("getGrapeVarietySlugs failed", error);
    return [];
  }
}

export async function getWinesForSommelier(): Promise<WineWithRelations[]> {
  try {
    const rows = await db.query.wines.findMany({
      with: { winery: true, region: true },
      where: catalogWineCondition(),
    });
    return rows as WineWithRelations[];
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
 * Lightweight autocomplete over wine and winery names.
 */
export async function getSearchSuggestions(
  query: string,
  limit = 6,
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;

  try {
    const [wineRows, wineryRows] = await Promise.all([
      db
        .select({
          name: wines.name,
          slug: wines.slug,
          vintage: wines.vintage,
        })
        .from(wines)
        .where(and(catalogWineCondition(), like(wines.name, pattern)))
        .orderBy(desc(wines.valueScore))
        .limit(limit),
      db
        .select({ name: wineries.name, slug: wineries.slug })
        .from(wineries)
        .where(like(wineries.name, pattern))
        .limit(limit),
    ]);

    const wineSuggestions: SearchSuggestion[] = wineRows.map((row) => ({
      type: "wine",
      name: row.name,
      slug: row.slug,
      vintage: row.vintage,
    }));

    const winerySuggestions: SearchSuggestion[] = wineryRows.map((row) => ({
      type: "winery",
      name: row.name,
      slug: row.slug,
    }));

    return [...wineSuggestions, ...winerySuggestions].slice(0, limit + 2);
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
 * Regiuni "featured" pentru directoare publice (ex. /crame). Filtram strict la
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
