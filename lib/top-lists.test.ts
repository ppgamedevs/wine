import { describe, expect, it } from "vitest";
import {
  buildAllTopListSlugCandidates,
  getIndexableTopListSlugs,
  getResolvableTopListSlugs,
  resolveTopList,
} from "@/lib/top-lists";
import type { WineWithRelations } from "@/types";

const NOW = new Date();

function freshLink(id: number) {
  return {
    retailer: "eMAG.ro",
    url: `https://l.profitshare.ro/l/1614${String(id).padStart(4, "0")}`,
    merchantUrl: `https://www.emag.ro/vin-test-${id}/pd/D4BLPY${id}/`,
    merchantProductId: `D4BLPY${id}`,
    productKey: `test-wine-${id}`,
    bottleSizeMl: 750,
    vintage: null,
    priceRon: 25,
    checkedAt: NOW.toISOString(),
    inStock: true,
    verificationStatus: "verified",
    currency: "RON",
  } as const;
}

function pricedWine(
  id: number,
  price: number,
  valueScore: number,
  supermarket = false,
): WineWithRelations {
  const base = wine(id);
  return {
    ...base,
    priceAvg: price,
    currentPrice: price,
    valueScore,
    sourceUrl: supermarket
      ? "https://www.emag.ro/vin-test/pd/DTEST0001/"
      : base.sourceUrl,
    affiliateLinks: [
      {
        ...freshLink(id),
        priceRon: price,
      },
    ],
  } as WineWithRelations;
}

function wine(id: number, withPrice = true): WineWithRelations {
  return {
    id,
    slug: `test-wine-${id}`,
    name: `Test Wine ${id} 0.75L`,
    wineryId: id,
    winery: { name: `Winery ${id}`, slug: `winery-${id}` },
    region: { name: "Dealu Mare", slug: "dealu-mare" },
    type: "red",
    sweetness: "sec",
    vintage: null,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    priceAvg: withPrice ? 25 : null,
    currentPrice: withPrice ? 25 : null,
    valueScore: withPrice ? 70 : null,
    priceHistory: [],
    affiliateLinks: withPrice ? [freshLink(id)] : [],
    foodPairings: [],
    foodPairingNotes: [],
    dessertPairings: [],
    medals: [],
    tastingNotes: "Cireșe, prune.",
    qualityFinal: 80,
    qualityEffective: null,
    estimatedQuality: null,
    imageUrl: null,
    producerPageUrl: "https://example.test/wine",
  } as unknown as WineWithRelations;
}

describe("top-list recovery semantics", () => {
  it("keeps an advertised budget route with zero qualifying wines", () => {
    const list = resolveTopList("vinuri-sub-50-lei", [wine(1, false)]);
    expect(list).not.toBeNull();
    expect(list?.wines).toHaveLength(0);
    expect(getIndexableTopListSlugs([wine(1, false)], [])).not.toContain(
      "vinuri-sub-50-lei",
    );
  });

  it("keeps a primary ranking with fewer than 8 wines accessible and indexable", () => {
    const wines = Array.from({ length: 7 }, (_, index) => wine(index + 1));
    const list = resolveTopList("vinuri-sub-50-lei", wines);
    expect(list?.wines).toHaveLength(7);
    expect(getIndexableTopListSlugs(wines, [])).toContain(
      "vinuri-sub-50-lei",
    );
  });

  it("indexes a non-primary ranking only at 8 or more wines", () => {
    const seven = Array.from({ length: 7 }, (_, index) => wine(index + 1));
    const eight = [...seven, wine(8)];
    expect(getResolvableTopListSlugs(seven, [])).not.toContain(
      "vinuri-sub-75-lei",
    );
    expect(getResolvableTopListSlugs(eight, [])).toContain(
      "vinuri-sub-75-lei",
    );
    expect(getIndexableTopListSlugs(seven, [])).not.toContain(
      "vinuri-sub-75-lei",
    );
  });

  it("does not generate the malformed pentru-pentru-desert slug", () => {
    const candidates = buildAllTopListSlugCandidates([]);
    expect(candidates).toContain("vinuri-sub-50-lei-pentru-desert");
    expect(candidates).not.toContain(
      "vinuri-sub-50-lei-pentru-pentru-desert",
    );
    expect(resolveTopList("vinuri-sub-50-lei-pentru-desert", [])).not.toBeNull();
  });

  it("does not invent wines when no offers exist", () => {
    const list = resolveTopList("vinuri-bune-din-supermarket", [wine(1, false)]);
    expect(list?.wines).toEqual([]);
  });

  it("uses one deterministic price-eligible set across budget rankings", () => {
    const wines = [
      pricedWine(1, 21, 79),
      pricedWine(2, 25, 80),
      pricedWine(3, 35, 72),
      pricedWine(4, 45, 70),
      pricedWine(5, 65, 77),
      pricedWine(6, 80, 79),
      pricedWine(7, 99, 76),
      pricedWine(8, 120, 70),
    ];
    const under50 = resolveTopList("vinuri-sub-50-lei", wines);
    const under75 = resolveTopList("vinuri-sub-75-lei", wines);
    const under100 = resolveTopList("vinuri-sub-100-lei", wines);
    const under150 = resolveTopList("vinuri-sub-150-lei", wines);

    expect(under50?.wines).toHaveLength(4);
    expect(under75?.wines).toHaveLength(5);
    expect(under100?.wines).toHaveLength(7);
    expect(under150?.wines).toHaveLength(8);
    expect(under50?.wines.map((w) => w.id)).toEqual([2, 1, 3, 4]);
    expect(under75?.wines.map((w) => w.id)).toEqual([2, 1, 5, 3, 4]);
    expect(under100?.wines.map((w) => w.id)).toEqual([2, 1, 6, 5, 7, 3, 4]);
    expect(under150?.wines.map((w) => w.id)).toEqual([
      2, 1, 6, 5, 7, 3, 4, 8,
    ]);
  });

  it("keeps supermarket rankings to priced Value-Score wines", () => {
    const list = resolveTopList("vinuri-bune-din-supermarket", [
      pricedWine(1, 25, 80, true),
      wine(2, false),
      pricedWine(3, 30, 70, true),
    ]);
    expect(list?.wines.map((wineItem) => wineItem.id)).toEqual([1, 3]);
    expect(list?.wines.every((wineItem) => wineItem.priceAvg != null)).toBe(true);
    expect(list?.wines.every((wineItem) => wineItem.valueScore != null)).toBe(
      true,
    );
  });

  it("does not produce the broken 'la un pret de Pret indisponibil' FAQ", () => {
    const list = resolveTopList("vinuri-bune-din-supermarket", [wine(1, false)]);
    const answers = (list?.faq ?? []).map((item) => item.answer).join(" ");
    expect(answers.toLowerCase()).not.toContain("pret indisponibil");
  });
});
