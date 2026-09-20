import { foldRomanianText } from "@/lib/pairing/romanian-text";
import {
  wineMatchesGrapeVariety,
  type GrapeVarietyCatalogEntry,
} from "@/lib/grape-variety-index";

const CATALOG_SEARCH_STOPWORDS = new Set([
  "crama",
  "crame",
  "cramele",
  "winery",
  "wineries",
  "producator",
  "producatori",
  "producer",
  "producers",
  "vin",
  "vinuri",
  "wine",
  "wines",
  "sticla",
  "bottle",
  "soi",
  "soiuri",
  "soiul",
  "grape",
  "grapes",
  "variety",
  "varieties",
  "sort",
  "din",
  "from",
  "the",
  "and",
  "si",
  "de",
  "la",
  "pe",
  "doc",
  "igp",
  "romania",
  "romanesc",
  "romanesti",
  "romanian",
  "zona",
  "zone",
  "regiune",
  "regiuni",
  "region",
  "regions",
  "podgorie",
  "vineyard",
]);

const WINERY_HINTS = new Set([
  "crama",
  "crame",
  "cramele",
  "winery",
  "wineries",
  "producator",
  "producatori",
  "producer",
  "producers",
]);

const GRAPE_HINTS = new Set([
  "soi",
  "soiuri",
  "soiul",
  "grape",
  "grapes",
  "variety",
  "varieties",
  "sort",
]);

export interface CatalogSearchWineInput {
  name: string;
  slug: string;
  valueScore: number | null;
  grapeVarieties?: Array<{ name: string; slug?: string | null }>;
  winery?: { name: string; slug: string } | null;
  region?: { name: string; slug: string } | null;
}

export interface CatalogSearchWineryHit {
  name: string;
  slug: string;
}

export interface CatalogSearchGrapeHit {
  slug: string;
  name: string;
}

export interface CatalogSearchHits {
  wines: CatalogSearchWineInput[];
  wineries: CatalogSearchWineryHit[];
  grapes: CatalogSearchGrapeHit[];
  query: string;
}

export interface CatalogSearchLimits {
  wineLimit: number;
  wineryLimit: number;
  grapeLimit: number;
}

export function catalogSearchTokens(query: string): string[] {
  return foldRomanianText(query)
    .split(" ")
    .filter((token) => token.length >= 2);
}

export function significantCatalogSearchTokens(query: string): string[] {
  const tokens = catalogSearchTokens(query);
  const meaningful = tokens.filter(
    (token) => !CATALOG_SEARCH_STOPWORDS.has(token),
  );
  return meaningful.length > 0 ? meaningful : tokens;
}

export function catalogSearchHaystack(
  ...parts: Array<string | null | undefined>
): string {
  return foldRomanianText(parts.filter(Boolean).join(" "));
}

export function matchesCatalogSearch(
  haystack: string,
  tokens: readonly string[],
): boolean {
  if (tokens.length === 0) return false;
  const normalized =
    haystack === foldRomanianText(haystack)
      ? haystack
      : foldRomanianText(haystack);
  return tokens.every((token) => normalized.includes(token));
}

export function catalogSearchIntent(
  query: string,
): "winery" | "grape" | "any" {
  const tokens = catalogSearchTokens(query);
  if (tokens.some((token) => WINERY_HINTS.has(token))) return "winery";
  if (tokens.some((token) => GRAPE_HINTS.has(token))) return "grape";
  return "any";
}

function grapeLabels(
  grapes: CatalogSearchWineInput["grapeVarieties"],
): string[] {
  if (!Array.isArray(grapes)) return [];
  const labels: string[] = [];
  for (const grape of grapes) {
    if (!grape) continue;
    if (grape.name) labels.push(grape.name);
    if (grape.slug) labels.push(grape.slug.replaceAll("-", " "));
  }
  return labels;
}

export function wineSearchHaystack(
  wine: CatalogSearchWineInput,
  includeRegion = true,
): string {
  return catalogSearchHaystack(
    wine.name,
    wine.slug.replaceAll("-", " "),
    wine.winery?.name,
    wine.winery?.slug.replaceAll("-", " "),
    includeRegion ? wine.region?.name : undefined,
    includeRegion ? wine.region?.slug.replaceAll("-", " ") : undefined,
    ...grapeLabels(wine.grapeVarieties),
  );
}

export function winerySearchHaystack(winery: CatalogSearchWineryHit): string {
  return catalogSearchHaystack(
    winery.name,
    winery.slug.replaceAll("-", " "),
  );
}

export function grapeSearchHaystack(
  grape: Pick<GrapeVarietyCatalogEntry, "slug" | "name" | "aliases">,
): string {
  return catalogSearchHaystack(
    grape.name,
    grape.slug.replaceAll("-", " "),
    ...(grape.aliases ?? []),
  );
}

function matchRank(name: string, tokens: readonly string[]): number {
  const folded = foldRomanianText(name);
  const phrase = tokens.join(" ");
  if (folded === phrase) return 100;
  if (folded.startsWith(phrase)) return 80;
  if (folded.includes(phrase)) return 60;
  if (tokens.every((token) => folded.includes(token))) return 40;
  return 0;
}

function wineMatchRank(
  wine: CatalogSearchWineInput,
  tokens: readonly string[],
): number {
  const grapeRank = grapeLabels(wine.grapeVarieties).reduce(
    (best, label) => Math.max(best, matchRank(label, tokens)),
    0,
  );
  return Math.max(
    matchRank(wine.name, tokens),
    wine.winery ? matchRank(wine.winery.name, tokens) : 0,
    grapeRank,
  );
}

export function searchCatalogHits(
  wines: readonly CatalogSearchWineInput[],
  grapes: readonly GrapeVarietyCatalogEntry[],
  query: string,
  limits: CatalogSearchLimits,
  extraWineries: readonly CatalogSearchWineryHit[] = [],
): CatalogSearchHits {
  const trimmed = query.trim();
  const tokens = significantCatalogSearchTokens(trimmed);
  if (tokens.length === 0) {
    return { wines: [], wineries: [], grapes: [], query: trimmed };
  }
  const includeRegion = catalogSearchIntent(trimmed) !== "winery";

  const grapeMatches = grapes
    .filter((grape) => matchesCatalogSearch(grapeSearchHaystack(grape), tokens))
    .sort((left, right) => {
      const rankDelta =
        matchRank(right.name, tokens) - matchRank(left.name, tokens);
      if (rankDelta !== 0) return rankDelta;
      return left.slug.localeCompare(right.slug, "ro");
    });

  const matchedWines = wines
    .filter((wine) => {
      if (matchesCatalogSearch(wineSearchHaystack(wine, includeRegion), tokens)) {
        return true;
      }
      return grapeMatches.some((grape) =>
        wineMatchesGrapeVariety(
          {
            grapeVarieties: (wine.grapeVarieties ?? []).map((share) => ({
              name: share.name,
              slug: share.slug ?? undefined,
            })),
          },
          grape,
        ),
      );
    })
    .sort((left, right) => {
      const rankDelta = wineMatchRank(right, tokens) - wineMatchRank(left, tokens);
      if (rankDelta !== 0) return rankDelta;
      return (right.valueScore ?? 0) - (left.valueScore ?? 0);
    })
    .slice(0, limits.wineLimit);

  const wineriesBySlug = new Map<string, CatalogSearchWineryHit>();
  for (const wine of wines) {
    const winery = wine.winery;
    if (!winery?.slug || wineriesBySlug.has(winery.slug)) continue;
    if (!matchesCatalogSearch(winerySearchHaystack(winery), tokens)) continue;
    wineriesBySlug.set(winery.slug, {
      name: winery.name,
      slug: winery.slug,
    });
  }
  for (const winery of extraWineries) {
    if (!winery.slug || wineriesBySlug.has(winery.slug)) continue;
    if (!matchesCatalogSearch(winerySearchHaystack(winery), tokens)) continue;
    wineriesBySlug.set(winery.slug, winery);
  }

  const matchedWineries = [...wineriesBySlug.values()]
    .sort((left, right) => {
      const rankDelta =
        matchRank(right.name, tokens) - matchRank(left.name, tokens);
      if (rankDelta !== 0) return rankDelta;
      return left.name.localeCompare(right.name, "ro");
    })
    .slice(0, limits.wineryLimit);

  const matchedGrapes = grapeMatches
    .slice(0, limits.grapeLimit)
    .map((grape) => ({ slug: grape.slug, name: grape.name }));

  return {
    wines: matchedWines,
    wineries: matchedWineries,
    grapes: matchedGrapes,
    query: trimmed,
  };
}
