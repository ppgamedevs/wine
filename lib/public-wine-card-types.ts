import type { WineSweetness, WineType } from "@/types";

export const WINE_CATALOG_PAGE_SIZE = 24;
export const WINERY_DIRECTORY_PAGE_SIZE = 18;
export const MAX_PUBLIC_CATALOG_PAGE = 1_000;
export const MAX_PUBLIC_CATALOG_QUERY_LENGTH = 80;

export type PublicWineCatalogSort =
  | "value-desc"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export type PublicWineCatalogVerdict = "all" | "recommended" | "exceptional";
export type PublicWineCatalogPriceBand =
  | "all"
  | "under50"
  | "50-100"
  | "over100";

export interface PublicWineCatalogFilters {
  query: string;
  type: "all" | WineType;
  sweetness: "all" | WineSweetness;
  sort: PublicWineCatalogSort;
  verdict: PublicWineCatalogVerdict;
  priceBand: PublicWineCatalogPriceBand;
}

export interface PublicWineCatalogRequest {
  filters: PublicWineCatalogFilters;
  page: number;
}

export interface PublicWineryDirectoryRequest {
  query: string;
  page: number;
}

export type PublicCatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;

const WINE_TYPES: ReadonlySet<string> = new Set([
  "red",
  "white",
  "rose",
  "sparkling",
  "orange",
  "dessert",
]);
const WINE_SWEETNESS: ReadonlySet<string> = new Set([
  "sec",
  "demisec",
  "demidulce",
  "dulce",
]);
const WINE_SORTS: ReadonlySet<string> = new Set([
  "value-desc",
  "price-asc",
  "price-desc",
  "name-asc",
]);
const WINE_VERDICTS: ReadonlySet<string> = new Set([
  "recommended",
  "exceptional",
]);
const WINE_PRICE_BANDS: ReadonlySet<string> = new Set([
  "under50",
  "50-100",
  "over100",
]);

function scalarParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function boundedQuery(value: string | string[] | undefined): string {
  return (scalarParam(value) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PUBLIC_CATALOG_QUERY_LENGTH);
}

export function parsePublicCatalogPage(
  value: string | string[] | undefined,
): number {
  const raw = scalarParam(value);
  if (!raw || !/^[1-9]\d*$/.test(raw)) return 1;
  return Math.min(Number(raw), MAX_PUBLIC_CATALOG_PAGE);
}

export function parsePublicWineCatalogRequest(
  searchParams: PublicCatalogSearchParams,
): PublicWineCatalogRequest {
  const type = scalarParam(searchParams.type);
  const sweetness = scalarParam(searchParams.sweetness);
  const sort = scalarParam(searchParams.sort);
  const verdict = scalarParam(searchParams.score);
  const priceBand = scalarParam(searchParams.price);

  return {
    page: parsePublicCatalogPage(searchParams.page),
    filters: {
      query: boundedQuery(searchParams.q),
      type: WINE_TYPES.has(type ?? "")
        ? (type as WineType)
        : "all",
      sweetness: WINE_SWEETNESS.has(sweetness ?? "")
        ? (sweetness as WineSweetness)
        : "all",
      sort: WINE_SORTS.has(sort ?? "")
        ? (sort as PublicWineCatalogSort)
        : "value-desc",
      verdict: WINE_VERDICTS.has(verdict ?? "")
        ? (verdict as PublicWineCatalogVerdict)
        : "all",
      priceBand: WINE_PRICE_BANDS.has(priceBand ?? "")
        ? (priceBand as PublicWineCatalogPriceBand)
        : "all",
    },
  };
}

export function parsePublicWineryDirectoryRequest(
  searchParams: PublicCatalogSearchParams,
): PublicWineryDirectoryRequest {
  return {
    query: boundedQuery(searchParams.q),
    page: parsePublicCatalogPage(searchParams.page),
  };
}

export interface PublicCatalogPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PublicCatalogFacet<T extends string> {
  id: T;
  count: number;
}

export interface PublicWineCatalogFacets {
  types: Array<PublicCatalogFacet<"all" | WineType>>;
  sweetness: Array<PublicCatalogFacet<"all" | WineSweetness>>;
}

export interface PublicWineCatalogPage extends PublicCatalogPage<PublicWineCardViewModel> {
  facets: PublicWineCatalogFacets;
}

export interface WineCardAnalyticsViewModel {
  winerySlug: string;
  wineSlug: string;
}

export interface WineCardPriceViewModel {
  status: "verified" | "estimated" | "unavailable";
  displayPrice: number | null;
  isVerifiedRecent: boolean;
  purchaseLink: {
    url: string;
    retailer: string;
  } | null;
  verifyPriceUrl: string | null;
  canVerifyPrice: boolean;
}

export interface PublicWineCardViewModel {
  slug: string;
  name: string;
  displayName: string;
  type: WineType;
  typeLabel: string;
  vintage: number | null;
  valueScore: number | null;
  displayedRankScore: number | null;
  displayedRankLabel: string;
  image: {
    url: string | null;
    source: string | null;
    alt: string | null;
    wineryName: string | null;
  };
  wineryName: string | null;
  regionName: string | null;
  price: WineCardPriceViewModel;
  analytics: WineCardAnalyticsViewModel | null;
}

export interface PublicWineCatalogItem {
  type: WineType;
  sweetness: WineSweetness | null;
  valueScore: number | null;
  filterPrice: number | null;
  searchText: string;
  card: PublicWineCardViewModel;
}

export interface PublicWineryWineHighlight {
  slug: string;
  name: string;
  valueScore: number | null;
}

export interface PublicWineryDirectoryItem {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  verified: boolean;
  regionName: string | null;
  wineCount: number;
  avgValueScore: number | null;
  priceRange: { min: number; max: number } | null;
  bestWine: PublicWineryWineHighlight | null;
  bestUnder50: PublicWineryWineHighlight | null;
  topGrapes: string[];
  lastPriceCheck: string | null;
}
