import { describe, expect, it } from "vitest";
import { buildPublicWineCardViewModel } from "@/lib/public-wine-card";
import type { WineWithRelations } from "@/types";

// A fixed calendar date makes the "fresh offer" fixture stale after 48 hours.
const NOW = new Date();

function wine(overrides: Record<string, unknown> = {}): WineWithRelations {
  return {
    id: 1,
    slug: "test-wine-0-75l",
    name: "Test Wine 0.75L",
    type: "red",
    sweetness: "sec",
    vintage: null,
    qualityFinal: 78,
    estimatedQuality: null,
    qualityEffective: null,
    valueScore: 82,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    region: { name: "Dealu Mare", slug: "dealu-mare" },
    winery: { name: "Crama Test", slug: "crama-test" },
    tastingNotes: "Cireasa, prune, tanin ferm.",
    medals: [],
    criticScore: null,
    ratingAvg: null,
    ratingCount: 0,
    communityScore: null,
    producerPageUrl: "https://example.test/wine",
    tastingSheetUrl: null,
    alcohol: 13.5,
    acidity: 6.2,
    producerContent: null,
    affiliateLinks: [],
    priceHistory: [],
    imageUrl: null,
    imageSource: null,
    imageAlt: null,
    ...overrides,
  } as unknown as WineWithRelations;
}

function freshOffer(overrides: Record<string, unknown> = {}) {
  return {
    retailer: "eMAG.ro",
    url: "https://l.profitshare.ro/l/testoffer",
    wineSlug: "test-wine-0-75l",
    productKey: "test-wine-0-75l",
    bottleSizeMl: 750,
    vintage: null,
    priceRon: 79,
    checkedAt: NOW.toISOString(),
    inStock: true,
    ...overrides,
  };
}

describe("public wine card score semantics", () => {
  it("shows quality without a price and hides value", () => {
    const card = buildPublicWineCardViewModel(wine());
    expect(card.qualityScore).toBe(78);
    expect(card.qualityStatus).toBe("known");
    expect(card.valueScore).toBeNull();
    expect(card.valueScoreStatus).toBe("unavailable");
    expect(card.displayedRankScore).toBeNull();
  });

  it("shows both scores with an exact fresh offer", () => {
    const card = buildPublicWineCardViewModel(
      wine({ affiliateLinks: [freshOffer()] }),
    );
    expect(card.qualityScore).toBe(78);
    expect(card.valueScore).toBe(82);
    expect(card.valueScoreStatus).toBe("known");
  });

  it("shows an insufficient-data state when quality evidence is absent", () => {
    const card = buildPublicWineCardViewModel(
      wine({
        qualityFinal: null,
        estimatedQuality: null,
        qualityEffective: null,
        tastingNotes: null,
        grapeVarieties: [],
        producerPageUrl: null,
        medals: [],
      }),
    );
    expect(card.qualityStatus).toBe("insufficient");
    expect(card.qualityScore).toBeNull();
  });
});
