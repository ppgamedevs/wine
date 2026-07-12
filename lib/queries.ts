import "server-only";
import { and, asc, count, desc, eq, gte, like, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { grapeVarieties, wineryEvents, wineries, wines } from "@/lib/schema";
import { andCatalog, catalogWineCondition } from "@/lib/wine-catalog";
import { normalizeWineRow, normalizeWineRows } from "@/lib/normalize-wine";
import { MIN_RECOMMENDED_VALUE_SCORE } from "@/lib/value-score-thresholds";
import type {
  WineryEvent,
  WineryListItem,
  WineryWithWines,
  WineWithRelations,
} from "@/types";

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
          columns: { valueScore: true, priceAvg: true, status: true },
        },
      },
      orderBy: () => [asc(wineries.name)],
    });

    return rows.map((row) => {
      const { wines: wineryWines, region, ...base } = row;
      const visibleWines = wineryWines.filter(
        (wine) => wine.status !== "rejected",
      );

      const valueScores = visibleWines
        .map((w) => w.valueScore)
        .filter((v): v is number => v !== null && v !== undefined);
      const avgValueScore =
        valueScores.length > 0
          ? Math.round(
              valueScores.reduce((a, b) => a + b, 0) / valueScores.length,
            )
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

      return {
        ...base,
        region: region ?? null,
        wineCount: visibleWines.length,
        avgValueScore,
        priceRange,
      } satisfies WineryListItem;
    });
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
    return await db
      .select({ slug: wineries.slug, updatedAt: wineries.updatedAt })
      .from(wineries);
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
