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
});
