import { wineSweetnessLabel, wineTypeLabel } from "@/lib/format";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_EXCEPTIONAL_MIN,
} from "@/lib/value-score-thresholds";
import type { WineSweetness, WineType, WineWithRelations } from "@/types";

export type CatalogTypeFilter = "all" | WineType;

export type CatalogSweetnessFilter = "all" | WineSweetness;

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
  sweetness: CatalogSweetnessFilter;
  sort: CatalogSort;
  verdict: CatalogVerdictFilter;
  priceBand: CatalogPriceBand;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  query: "",
  type: "all",
  sweetness: "all",
  sort: "value-desc",
  verdict: "all",
  priceBand: "all",
};

export const CATALOG_SORT_OPTIONS: Array<{ id: CatalogSort; label: string }> = [
  { id: "value-desc", label: "Value Score (cel mai bun)" },
  { id: "price-asc", label: "Pret crescator" },
  { id: "price-desc", label: "Pret descrescator" },
  { id: "name-asc", label: "Nume A-Z" },
];

/** Display order for grouped catalog sections. */
export const CATALOG_TYPE_ORDER: WineType[] = [
  "white",
  "red",
  "rose",
  "sparkling",
  "orange",
  "dessert",
];

export const CATALOG_SWEETNESS_ORDER: WineSweetness[] = [
  "sec",
  "demisec",
  "demidulce",
  "dulce",
];

export const CATALOG_TYPE_CHIP_LABEL: Record<CatalogTypeFilter, string> = {
  all: "Toate",
  red: "Rosu",
  white: "Alb",
  rose: "Roze",
  sparkling: "Spumant",
  orange: "Orange",
  dessert: "Desert",
};

export const CATALOG_SWEETNESS_CHIP_LABEL: Record<CatalogSweetnessFilter, string> = {
  all: "Toate",
  sec: wineSweetnessLabel.sec,
  demisec: wineSweetnessLabel.demisec,
  demidulce: wineSweetnessLabel.demidulce,
  dulce: wineSweetnessLabel.dulce,
};

export const CATALOG_PRICE_BAND_LABEL: Record<CatalogPriceBand, string> = {
  all: "Orice pret",
  under50: "Sub 50 RON",
  "50-100": "50-100 RON",
  over100: "Peste 100 RON",
};

export interface CatalogTypeOption {
  id: CatalogTypeFilter;
  label: string;
  count: number;
}

export interface CatalogSweetnessOption {
  id: CatalogSweetnessFilter;
  label: string;
  count: number;
}

export interface CatalogActiveChip {
  key: "type" | "sweetness" | "priceBand" | "verdict" | "query";
  label: string;
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

function matchesType(wine: WineWithRelations, type: CatalogTypeFilter): boolean {
  return type === "all" || wine.type === type;
}

function matchesSweetness(
  wine: WineWithRelations,
  sweetness: CatalogSweetnessFilter,
): boolean {
  if (sweetness === "all") return true;
  return wine.sweetness === sweetness;
}

function matchesSharedConstraints(
  wine: WineWithRelations,
  filters: CatalogFilterState,
  omit: Array<"type" | "sweetness"> = [],
): boolean {
  return (
    matchesQuery(wine, filters.query) &&
    matchesVerdict(wine, filters.verdict) &&
    matchesPriceBand(wine, filters.priceBand) &&
    (omit.includes("type") || matchesType(wine, filters.type)) &&
    (omit.includes("sweetness") || matchesSweetness(wine, filters.sweetness))
  );
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
  const filtered = wines.filter((wine) => matchesSharedConstraints(wine, filters));
  return [...filtered].sort((a, b) => compareWines(a, b, filters.sort));
}

export function countWinesByType(
  wines: WineWithRelations[],
  filters: CatalogFilterState,
): CatalogTypeOption[] {
  const base = wines.filter((wine) =>
    matchesSharedConstraints(wine, filters, ["type"]),
  );
  const options: CatalogTypeOption[] = [
    { id: "all", label: CATALOG_TYPE_CHIP_LABEL.all, count: base.length },
    ...CATALOG_TYPE_ORDER.map((type) => ({
      id: type as CatalogTypeFilter,
      label: CATALOG_TYPE_CHIP_LABEL[type],
      count: base.filter((wine) => wine.type === type).length,
    })),
  ];
  return options.filter((option) => option.id === "all" || option.count > 0);
}

export function countWinesBySweetness(
  wines: WineWithRelations[],
  filters: CatalogFilterState,
): CatalogSweetnessOption[] {
  const base = wines.filter((wine) =>
    matchesSharedConstraints(wine, filters, ["sweetness"]),
  );
  return [
    { id: "all", label: CATALOG_SWEETNESS_CHIP_LABEL.all, count: base.length },
    ...CATALOG_SWEETNESS_ORDER.map((sweetness) => ({
      id: sweetness as CatalogSweetnessFilter,
      label: CATALOG_SWEETNESS_CHIP_LABEL[sweetness],
      count: base.filter((wine) => wine.sweetness === sweetness).length,
    })),
  ];
}

export function hasActiveCatalogFilters(filters: CatalogFilterState): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.type !== "all" ||
    filters.sweetness !== "all" ||
    filters.verdict !== "all" ||
    filters.priceBand !== "all" ||
    filters.sort !== "value-desc"
  );
}

export function catalogActiveFilterChips(
  filters: CatalogFilterState,
): CatalogActiveChip[] {
  const chips: CatalogActiveChip[] = [];
  if (filters.query.trim()) {
    chips.push({ key: "query", label: `"${filters.query.trim()}"` });
  }
  if (filters.type !== "all") {
    chips.push({ key: "type", label: CATALOG_TYPE_CHIP_LABEL[filters.type] });
  }
  if (filters.sweetness !== "all") {
    chips.push({
      key: "sweetness",
      label: CATALOG_SWEETNESS_CHIP_LABEL[filters.sweetness],
    });
  }
  if (filters.priceBand !== "all") {
    chips.push({
      key: "priceBand",
      label: CATALOG_PRICE_BAND_LABEL[filters.priceBand],
    });
  }
  if (filters.verdict === "recommended") {
    chips.push({ key: "verdict", label: "Merita pretul" });
  }
  if (filters.verdict === "exceptional") {
    chips.push({ key: "verdict", label: "Exceptionale" });
  }
  return chips;
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
    label: CATALOG_TYPE_CHIP_LABEL[type],
    wines: wines.filter((wine) => wine.type === type),
  })).filter((section) => section.wines.length > 0);
}

export function catalogSectionHeading(type: WineType, count: number): string {
  if (type === "white") return `Vinuri albe · ${count}`;
  if (type === "red") return `Vinuri rosii · ${count}`;
  if (type === "rose") return `Vinuri roze · ${count}`;
  if (type === "sparkling") return `Spumante · ${count}`;
  if (type === "orange") return `Orange · ${count}`;
  return `Vinuri ${wineTypeLabel[type].toLowerCase()} · ${count}`;
}
