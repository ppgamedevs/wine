import { describe, expect, it } from "vitest";
import {
  searchCatalogHits,
  significantCatalogSearchTokens,
  type CatalogSearchWineInput,
} from "@/lib/catalog-search";

const wines: CatalogSearchWineInput[] = [
  {
    name: "Sable Noble Roze",
    slug: "sable-noble-roze",
    valueScore: 69,
    grapeVarieties: [{ name: "Pinot Noir", slug: "pinot-noir" }],
    winery: { name: "Murfatlar", slug: "murfatlar" },
    region: { name: "Murfatlar", slug: "murfatlar" },
  },
  {
    name: "Vin Roze Sec Miraz Roze",
    slug: "miraz-roze",
    valueScore: 78,
    grapeVarieties: [{ name: "Pinot Noir", slug: "pinot-noir" }],
    winery: { name: "Crama Gabai", slug: "gabai" },
    region: { name: "Murfatlar", slug: "murfatlar" },
  },
  {
    name: "Clasic Feteasca Neagra Sec",
    slug: "clasic-feteasca-neagra",
    valueScore: 76,
    grapeVarieties: [
      { name: "Fetească Neagră", slug: "feteasca-neagra" },
    ],
    winery: { name: "Budureasca", slug: "budureasca" },
    region: { name: "Dealu Mare", slug: "dealu-mare" },
  },
];

const grapes = [
  {
    slug: "feteasca-neagra",
    name: "Feteasca Neagra",
    aliases: ["feteasca negra", "fetească neagră"],
  },
  {
    slug: "pinot-noir",
    name: "Pinot Noir",
    aliases: ["pinot negru"],
  },
];

const limits = { wineLimit: 24, wineryLimit: 8, grapeLimit: 8 };

describe("catalog search", () => {
  it("treats crama as optional so Murfatlar still matches", () => {
    expect(significantCatalogSearchTokens("crama murfatlar")).toEqual([
      "murfatlar",
    ]);

    const result = searchCatalogHits(wines, grapes, "crama murfatlar", limits);

    expect(result.wineries.map((hit) => hit.slug)).toContain("murfatlar");
    expect(result.wines.map((wine) => wine.slug)).toContain("sable-noble-roze");
    expect(result.wines.map((wine) => wine.slug)).not.toContain("miraz-roze");
  });

  it("keeps regional wines when the query is just the place name", () => {
    const result = searchCatalogHits(wines, grapes, "murfatlar", limits);
    expect(result.wines.map((wine) => wine.slug)).toEqual(
      expect.arrayContaining(["sable-noble-roze", "miraz-roze"]),
    );
  });

  it("finds accented grape names, aliases, and their wines", () => {
    const result = searchCatalogHits(wines, grapes, "feteasca neagra", limits);

    expect(result.grapes.map((hit) => hit.slug)).toEqual(["feteasca-neagra"]);
    expect(result.wines.map((wine) => wine.slug)).toContain(
      "clasic-feteasca-neagra",
    );
    expect(result.wineries.map((hit) => hit.slug)).not.toContain("murfatlar");

    const alias = searchCatalogHits(wines, grapes, "feteasca negra", limits);
    expect(alias.grapes.map((hit) => hit.slug)).toEqual(["feteasca-neagra"]);
    expect(alias.wines.map((wine) => wine.slug)).toContain(
      "clasic-feteasca-neagra",
    );
  });

  it("ranks the producer wines first when the query is the winery name", () => {
    const result = searchCatalogHits(wines, grapes, "murfatlar", limits);
    expect(result.wineries.map((hit) => hit.slug)[0]).toBe("murfatlar");
    expect(result.wines.map((wine) => wine.slug)[0]).toBe("sable-noble-roze");
  });

  it("includes extra catalog wineries even when their wines are not in the set", () => {
    const result = searchCatalogHits(
      wines,
      grapes,
      "recas",
      limits,
      [{ name: "Cramele Recas", slug: "recas" }],
    );
    expect(result.wineries.map((hit) => hit.slug)).toEqual(["recas"]);
    expect(result.wines).toEqual([]);
  });

  it("finds a winery by producer name without the wine title", () => {
    const result = searchCatalogHits(wines, grapes, "gabai", limits);

    expect(result.wineries.map((hit) => hit.slug)).toEqual(["gabai"]);
    expect(result.wines.map((wine) => wine.slug)).toEqual(["miraz-roze"]);
  });
});
