/**
 * Producer-specific official catalog discovery for Prompt 16. Read only.
 */
import {
  fetchBudureascaCatalogItems,
  matchBudureascaWineRecord,
  parseBudureascaProductPage,
} from "@/lib/budureasca-producer";
import { fetchGabaiCatalogItems } from "@/lib/gabai-producer";
import { fetchMurfatlarCatalogItems } from "@/lib/murfatlar-producer";
import { fetchOfficialSources } from "@/lib/tech-facts/fetch-source";
import { classifySourceName } from "@/lib/tech-facts/source-identity";
import type { RecoverableWine } from "@/lib/tech-facts/recover";

function wineColor(type: string): "alb" | "rosu" | "roze" | "spumant" | null {
  if (type === "white") return "alb";
  if (type === "red") return "rosu";
  if (type === "rose") return "roze";
  if (type === "sparkling") return "spumant";
  return null;
}

export async function auditBudureascaCatalog(wines: RecoverableWine[]) {
  const dbWines = wines.filter((wine) => wine.winerySlug === "budureasca");
  if (dbWines.length === 0) return null;
  const listing = await fetchBudureascaCatalogItems({ maxPages: 10 });
  const fetched = await fetchOfficialSources(listing.map((item) => item.url));
  const records = fetched.sources
    .filter((source) => source.html)
    .map((source) => parseBudureascaProductPage(source.html!, source.finalUrl))
    .filter((record): record is NonNullable<typeof record> => record != null);
  const matches = dbWines.map((wine) => {
    const result = matchBudureascaWineRecord(records, {
      name: wine.name,
      vintage: wine.vintage,
      color: wineColor(wine.type),
      sweetness: wine.sweetness as "sec" | "demisec" | "demidulce" | "dulce" | null,
    });
    return {
      slug: wine.slug,
      dbName: wine.name,
      dbVintage: wine.vintage,
      status: result.status,
      officialUrl: result.wine?.producerPageUrl ?? null,
      sourceName: result.wine?.name ?? null,
      sourceVintage: result.wine?.vintage ?? null,
      sku: result.wine?.sku ?? null,
      line: result.wine?.line ?? null,
      color: result.wine?.color ?? null,
      sweetness: result.wine?.sweetness ?? null,
      alcohol: result.wine?.alcohol ?? null,
      grapes: result.wine?.grapeVarieties ?? [],
      volumeMl: result.wine?.volumeMl ?? null,
      imageUrl: result.wine?.imageUrl ?? null,
      replacementCandidate:
        result.wine &&
        result.wine.producerPageUrl !== wine.producerPageUrl
          ? result.wine.producerPageUrl
          : null,
      reasons: result.reasons,
    };
  });
  return {
    dbWines: dbWines.length,
    currentCatalogListings: listing.length,
    productPagesFetched: fetched.stats.ok,
    productPageFailures: fetched.attempts
      .filter((attempt) => !attempt.ok)
      .map((attempt) => ({
        url: attempt.url,
        class: attempt.failureClass,
        httpStatus: attempt.httpStatus,
        reason: attempt.reason,
      })),
    fetchFailureTally: fetched.attempts.reduce<Record<string, number>>((tally, attempt) => {
      if (!attempt.failureClass) return tally;
      tally[attempt.failureClass] = (tally[attempt.failureClass] ?? 0) + 1;
      return tally;
    }, {}),
    currentProducts: records,
    matches,
  };
}

export async function auditGabaiCatalog(wines: RecoverableWine[]) {
  const dbWines = wines.filter((wine) => wine.winerySlug === "crama-gabai");
  if (dbWines.length === 0) return null;
  const listing = await fetchGabaiCatalogItems();
  return {
    dbWines: dbWines.length,
    currentCatalogListings: listing.length,
    rows: dbWines.map((wine) => {
      const matches = listing.filter((item) => {
        const name = classifySourceName(wine.name, item.name);
        return name === "SOURCE_NAME_EXACT";
      });
      return {
        slug: wine.slug,
        storedUrl: wine.producerPageUrl,
        status:
          matches.length === 1
            ? "EXACT_CURRENT_PAGE"
            : matches.length > 1
              ? "AMBIGUOUS_PRODUCT"
              : "NO_OFFICIAL_SOURCE_FOUND",
        currentUrl: matches.length === 1 ? matches[0]!.url : null,
        replacementCandidate:
          matches.length === 1 && matches[0]!.url !== wine.producerPageUrl
            ? matches[0]!.url
            : null,
      };
    }),
  };
}

export async function auditMurfatlarCatalog(wines: RecoverableWine[]) {
  const dbWines = wines.filter((wine) => wine.winerySlug === "murfatlar");
  if (dbWines.length === 0) return null;
  const listing = await fetchMurfatlarCatalogItems();
  return {
    dbWines: dbWines.length,
    currentCatalogListings: listing.length,
    rows: dbWines.map((wine) => {
      const matches = listing.filter((item) => {
        const name = classifySourceName(wine.name, item.name);
        return name === "SOURCE_NAME_EXACT" || name === "SOURCE_NAME_PARTIAL";
      });
      return {
        slug: wine.slug,
        dbWine: wine.name,
        storedUrl: wine.producerPageUrl,
        officialCatalogMatches: matches,
        identityStatus:
          matches.length === 1
            ? "VALID_EXACT_PRODUCT_UNDATED"
            : matches.length > 1
              ? "AMBIGUOUS_PRODUCT"
              : "NO_OFFICIAL_SOURCE_FOUND",
        sourceVintage: null,
        alcohol: null,
        totalAcidity: null,
        residualSugar: null,
      };
    }),
  };
}

export async function runProducerCatalogAudits(wines: RecoverableWine[]) {
  async function safe<T>(run: () => Promise<T>): Promise<T | { error: string }> {
    try {
      return await run();
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unknown catalog audit error" };
    }
  }
  const [budureasca, gabai, murfatlar] = await Promise.all([
    safe(() => auditBudureascaCatalog(wines)),
    safe(() => auditGabaiCatalog(wines)),
    safe(() => auditMurfatlarCatalog(wines)),
  ]);
  return { budureasca, gabai, murfatlar };
}
