import { describe, expect, it } from "vitest";
import {
  CATALOG_SORT_OPTIONS,
  DEFAULT_CATALOG_FILTERS,
  catalogActiveFilterChips,
  countWinesBySweetness,
  countWinesByType,
  filterCatalogWines,
  hasActiveCatalogFilters,
  type CatalogFilterState,
} from "@/lib/wine-catalog-filters";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: slug.length,
    name: slug,
    slug,
    type: "red",
    sweetness: "sec",
    status: "verified",
    foodPairings: [],
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    valueScore: 70,
    priceAvg: 45,
    winery: { name: "Crama Test", slug: "crama-test" },
    region: { name: "Dealu Mare" },
    ...rest,
  } as WineWithRelations;
}

const catalog = [
  wine({ slug: "rosu-sec", type: "red", sweetness: "sec", valueScore: 88, priceAvg: 42 }),
  wine({
    slug: "rosu-demisec",
    type: "red",
    sweetness: "demisec",
    valueScore: 76,
    priceAvg: 48,
  }),
  wine({
    slug: "alb-sec",
    type: "white",
    sweetness: "sec",
    valueScore: 80,
    priceAvg: 39,
    grapeVarieties: [{ name: "Feteasca Regala" }],
  }),
  wine({
    slug: "alb-dulce",
    type: "white",
    sweetness: "dulce",
    valueScore: 74,
    priceAvg: 55,
  }),
  wine({
    slug: "roze-sec",
    type: "rose",
    sweetness: "sec",
    valueScore: 71,
    priceAvg: 36,
  }),
  wine({
    slug: "unknown-sweet",
    type: "red",
    sweetness: null,
    valueScore: 90,
    priceAvg: 40,
  }),
  wine({
    slug: "feteasca-scump",
    type: "red",
    sweetness: "sec",
    valueScore: 60,
    priceAvg: 120,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
  }),
];

function filters(patch: Partial<CatalogFilterState> = {}): CatalogFilterState {
  return { ...DEFAULT_CATALOG_FILTERS, ...patch };
}

describe("catalog sweetness and combined filters", () => {
  it("A: sweetness=sec returns only sec wines", () => {
    const rows = filterCatalogWines(catalog, filters({ sweetness: "sec" }));
    expect(rows.every((item) => item.sweetness === "sec")).toBe(true);
    expect(rows.map((item) => item.slug)).not.toContain("rosu-demisec");
  });

  it("B: demisec does not match demidulce", () => {
    const extra = [
      ...catalog,
      wine({ slug: "alb-demidulce", type: "white", sweetness: "demidulce" }),
    ];
    const rows = filterCatalogWines(extra, filters({ sweetness: "demisec" }));
    expect(rows.map((item) => item.slug)).toEqual(["rosu-demisec"]);
  });

  it("C: null sweetness appears in all, but not explicit sweetness filters", () => {
    const all = filterCatalogWines(catalog, filters());
    expect(all.map((item) => item.slug)).toContain("unknown-sweet");
    const sec = filterCatalogWines(catalog, filters({ sweetness: "sec" }));
    expect(sec.map((item) => item.slug)).not.toContain("unknown-sweet");
  });

  it("D: red + sec composes correctly", () => {
    const rows = filterCatalogWines(
      catalog,
      filters({ type: "red", sweetness: "sec" }),
    );
    expect(rows.every((item) => item.type === "red" && item.sweetness === "sec")).toBe(
      true,
    );
    expect(rows.map((item) => item.slug)).not.toContain("alb-sec");
  });

  it("E: white + dulce works", () => {
    const rows = filterCatalogWines(
      catalog,
      filters({ type: "white", sweetness: "dulce" }),
    );
    expect(rows.map((item) => item.slug)).toEqual(["alb-dulce"]);
  });

  it("F: type counts respect sweetness selection", () => {
    const options = countWinesByType(catalog, filters({ sweetness: "sec" }));
    const red = options.find((option) => option.id === "red");
    const white = options.find((option) => option.id === "white");
    expect(red?.count).toBe(2);
    expect(white?.count).toBe(1);
  });

  it("G: sweetness counts respect type selection", () => {
    const options = countWinesBySweetness(catalog, filters({ type: "white" }));
    const sec = options.find((option) => option.id === "sec");
    const dulce = options.find((option) => option.id === "dulce");
    expect(sec?.count).toBe(1);
    expect(dulce?.count).toBe(1);
    expect(options.find((option) => option.id === "all")?.count).toBe(2);
  });

  it("H: price + sweetness works", () => {
    const rows = filterCatalogWines(
      catalog,
      filters({ sweetness: "sec", priceBand: "under50" }),
    );
    expect(rows.every((item) => (item.priceAvg ?? 0) < 50)).toBe(true);
    expect(rows.map((item) => item.slug)).not.toContain("feteasca-scump");
  });

  it("I: Value verdict + sweetness works", () => {
    const rows = filterCatalogWines(
      catalog,
      filters({ sweetness: "sec", verdict: "recommended" }),
    );
    expect(rows.every((item) => (item.valueScore ?? 0) >= 75)).toBe(true);
    expect(rows.map((item) => item.slug)).not.toContain("feteasca-scump");
  });

  it("J: search + sweetness works", () => {
    const rows = filterCatalogWines(
      catalog,
      filters({ query: "Feteasca", sweetness: "sec" }),
    );
    expect(rows.every((item) => item.sweetness === "sec")).toBe(true);
    expect(rows.some((item) => item.slug === "alb-sec")).toBe(true);
    expect(rows.map((item) => item.slug)).not.toContain("alb-dulce");
  });

  it("K: reset restores sweetness=all", () => {
    const active = filters({ sweetness: "sec", type: "red" });
    expect(hasActiveCatalogFilters(active)).toBe(true);
    expect(hasActiveCatalogFilters(DEFAULT_CATALOG_FILTERS)).toBe(false);
    expect(DEFAULT_CATALOG_FILTERS.sweetness).toBe("all");
  });

  it("L: default remains Value Score descending", () => {
    expect(DEFAULT_CATALOG_FILTERS.sort).toBe("value-desc");
    const rows = filterCatalogWines(catalog, filters({ sweetness: "sec" }));
    const scores = rows.map((item) => item.valueScore ?? 0);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("M: no Gift/Food sorting is exposed", () => {
    expect(CATALOG_SORT_OPTIONS.map((option) => option.id)).toEqual([
      "value-desc",
      "price-asc",
      "price-desc",
      "name-asc",
    ]);
    expect(
      CATALOG_SORT_OPTIONS.some((option) => /gift|food/i.test(option.id + option.label)),
    ).toBe(false);
  });

  it("active chips include type, sweetness and price", () => {
    const chips = catalogActiveFilterChips(
      filters({ type: "red", sweetness: "sec", priceBand: "under50" }),
    );
    expect(chips.map((chip) => chip.label)).toEqual(["Rosu", "Sec", "Sub 50 RON"]);
  });
});
