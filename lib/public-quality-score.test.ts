import { qualityScoreTone } from "@/lib/public-quality-score";
import { describe, expect, it } from "vitest";
import {
  resolvePublicQualityScore,
  resolvePublicValueScore,
} from "@/lib/public-quality-score";
import type { WineWithRelations } from "@/types";

const NOW = new Date("2026-11-04T12:00:00.000Z");

function wine(overrides: Record<string, unknown> = {}): WineWithRelations {
  return {
    id: 1,
    slug: "test-wine-0-75l",
    name: "Test Wine 0.75L",
    type: "red",
    sweetness: "sec",
    vintage: null,
    estimatedQuality: null,
    qualityEffective: null,
    qualityFinal: null,
    valueScore: 82,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    region: { name: "Dealu Mare", slug: "dealu-mare" },
    winery: { name: "Crama Test", slug: "crama-test", verified: true },
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
    ...overrides,
  } as unknown as WineWithRelations;
}

function profitshareLink(overrides: Record<string, unknown> = {}) {
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

describe("public quality score", () => {
  it("shows quality when price is unavailable", () => {
    const quality = resolvePublicQualityScore(
      wine({ qualityFinal: 78, affiliateLinks: [] }),
    );
    const value = resolvePublicValueScore(wine({ qualityFinal: 78 }), NOW);
    expect(quality.status).toBe("known");
    expect(quality.score).toBe(78);
    expect(value.status).toBe("unavailable");
    expect(value.score).toBeNull();
    expect(value.reason).toBe("qualified_price_required");
  });

  it("shows quality and value when a fresh exact offer exists", () => {
    const candidate = wine({ qualityFinal: 78, affiliateLinks: [profitshareLink()] });
    expect(resolvePublicQualityScore(candidate).score).toBe(78);
    expect(resolvePublicValueScore(candidate, NOW)).toMatchObject({
      status: "known",
      score: 82,
      priceRon: 79,
    });
  });

  it("hides a weak estimated quality when substantive evidence is missing", () => {
    const quality = resolvePublicQualityScore(
      wine({
        estimatedQuality: 78,
        tastingNotes: null,
        producerContent: null,
        medals: [],
        criticScore: null,
      }),
    );
    expect(quality.status).toBe("insufficient");
    expect(quality.score).toBeNull();
  });

  it("does not unlock value from a stale Profitshare offer", () => {
    const stale = profitshareLink({
      checkedAt: "2026-10-01T12:00:00.000Z",
    });
    const value = resolvePublicValueScore(
      wine({ qualityFinal: 78, affiliateLinks: [stale] }),
      NOW,
    );
    expect(value.status).toBe("unavailable");
    expect(value.reason).toBe("stale_or_unqualified_offer");
  });

  it("does not reuse an offer for another vintage", () => {
    const candidate = wine({
      vintage: 2022,
      qualityFinal: 78,
      affiliateLinks: [profitshareLink({ vintage: 2021 })],
    });
    const value = resolvePublicValueScore(candidate, NOW);
    expect(value.status).toBe("unavailable");
  });
});


describe("price-independent quality score colors", () => {
  it("uses distinctly styled quality bands, not Value Score verdicts", () => {
    expect(qualityScoreTone(82)).toContain("emerald");
    expect(qualityScoreTone(79)).toContain("emerald");
    expect(qualityScoreTone(72)).toContain("teal");
    expect(qualityScoreTone(64)).toContain("amber");
    expect(qualityScoreTone(48)).toContain("rose");
    expect(qualityScoreTone(null)).toContain("muted");
  });
});
