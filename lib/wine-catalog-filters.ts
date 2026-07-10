import { wineTypeLabel } from "@/lib/format";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_EXCEPTIONAL_MIN,
} from "@/lib/value-score-thresholds";
import type { WineType, WineWithRelations } from "@/types";

export type CatalogTypeFilter = "all" | WineType;

export type CatalogSort =
  | "value-desc"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export type CatalogVerdictFilter = "all" | "recommended" | "exceptional";

export type CatalogPriceBand = "all" | "under50" | "50-100" | "over100";

export interface CatalogFilterState {
  query: string;
  type: CatalogTypeFilter;
  sort: CatalogSort;
  verdict: CatalogVerdictFilter;
  priceBand: CatalogPriceBand;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  query: "",
  type: "all",
  sort: "value-desc",
  verdict: "all",
  priceBand: "all",
};

/** Display order for grouped catalog sections. */
export const CATALOG_TYPE_ORDER: WineType[] = [
  "white",
  "red",
  "rose",
  "sparkling",
  "orange",
  "dessert",
];

export interface CatalogTypeOption {
  id: CatalogTypeFilter;
  label: string;
  count: number;
}

function winePrice(wine: WineWithRelations): number | null {
  const price = wine.currentPrice ?? wine.priceAvg;
  return price != null && price > 0 ? price : null;
}

function matchesQuery(wine: WineWithRelations, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const grapes = wine.grapeVarieties.map((grape) => grape.name).join(" ");
  const haystack = [
    wine.name,
    wine.winery?.name ?? "",
    wine.region?.name ?? "",
    wineTypeLabel[wine.type],
    wine.vintage?.toString() ?? "",
    grapes,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function matchesVerdict(
  wine: WineWithRelations,
  verdict: CatalogVerdictFilter,
): boolean {
  const score = wine.valueScore ?? 0;
  if (verdict === "recommended") {
    return score >= MIN_RECOMMENDED_VALUE_SCORE;
  }
  if (verdict === "exceptional") {
    return score >= VALUE_SCORE_EXCEPTIONAL_MIN;
  }
  return true;
}

function matchesPriceBand(
  wine: WineWithRelations,
  band: CatalogPriceBand,
): boolean {
  if (band === "all") return true;
  const price = winePrice(wine);
  if (price == null) return false;
  if (band === "under50") return price < 50;
  if (band === "50-100") return price >= 50 && price <= 100;
  return price > 100;
}

function compareWines(
  a: WineWithRelations,
  b: WineWithRelations,
  sort: CatalogSort,
): number {
  switch (sort) {
    case "price-asc": {
      const pa = winePrice(a) ?? Number.MAX_SAFE_INTEGER;
      const pb = winePrice(b) ?? Number.MAX_SAFE_INTEGER;
      return pa - pb || (b.valueScore ?? 0) - (a.valueScore ?? 0);
    }
    case "price-desc": {
      const pa = winePrice(a) ?? -1;
      const pb = winePrice(b) ?? -1;
      return pb - pa || (b.valueScore ?? 0) - (a.valueScore ?? 0);
    }
    case "name-asc":
      return a.name.localeCompare(b.name, "ro");
    case "value-desc":
    default:
      return (
        (b.valueScore ?? 0) - (a.valueScore ?? 0) ||
        a.name.localeCompare(b.name, "ro")
      );
  }
}

export function filterCatalogWines(
  wines: WineWithRelations[],
  filters: CatalogFilterState,
): WineWithRelations[] {
  const filtered = wines.filter(
    (wine) =>
      matchesQuery(wine, filters.query) &&
      matchesVerdict(wine, filters.verdict) &&
      matchesPriceBand(wine, filters.priceBand) &&
      (filters.type === "all" || wine.type === filters.type),
  );

  return [...filtered].sort((a, b) => compareWines(a, b, filters.sort));
}

export function countWinesByType(
  wines: WineWithRelations[],
  filters: Omit<CatalogFilterState, "type">,
): CatalogTypeOption[] {
  const base = wines.filter(
    (wine) =>
      matchesQuery(wine, filters.query) &&
      matchesVerdict(wine, filters.verdict) &&
      matchesPriceBand(wine, filters.priceBand),
  );

  const counts = new Map<CatalogTypeFilter, number>();
  counts.set("all", base.length);

  for (const type of CATALOG_TYPE_ORDER) {
    counts.set(type, base.filter((wine) => wine.type === type).length);
  }

  const options: CatalogTypeOption[] = [
    { id: "all", label: "Toate", count: counts.get("all") ?? 0 },
    ...CATALOG_TYPE_ORDER.map((type) => ({
      id: type as CatalogTypeFilter,
      label: wineTypeLabel[type],
      count: counts.get(type) ?? 0,
    })),
  ];

  return options.filter((option) => option.id === "all" || option.count > 0);
}

export interface CatalogTypeSection {
  type: WineType;
  label: string;
  wines: WineWithRelations[];
}

export function groupCatalogWinesByType(
  wines: WineWithRelations[],
): CatalogTypeSection[] {
  return CATALOG_TYPE_ORDER.map((type) => ({
    type,
    label: wineTypeLabel[type],
    wines: wines.filter((wine) => wine.type === type),
  })).filter((section) => section.wines.length > 0);
}

export function catalogSectionHeading(type: WineType, count: number): string {
  const label = wineTypeLabel[type].toLowerCase();
  if (type === "white") return `Vinuri albe · ${count}`;
  if (type === "red") return `Vinuri rosii · ${count}`;
  if (type === "rose") return `Vinuri rose · ${count}`;
  if (type === "sparkling") return `Spumante · ${count}`;
  if (type === "orange") return `Orange · ${count}`;
  return `Vinuri ${label} · ${count}`;
}
