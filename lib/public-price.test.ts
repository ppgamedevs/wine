import { describe, expect, it } from "vitest";
import {
  hasAffiliateTracking,
  isQualifyingProfitshareUrl,
  resolveAffiliatePurchaseUrl,
} from "@/lib/retailer-links";
import {
  PUBLIC_PRICE_MAX_AGE_HOURS,
  resolvePublicPrice,
  sanitizeWineForPublic,
} from "@/lib/public-price";
import {
  buildWinePriceViewModel,
  resolveWineDisplayPrice,
} from "@/lib/wine-price";
import {
  buildWineMetadataDescription,
  buildWineProductJsonLd,
  resolveWineOfferPrice,
} from "@/lib/wine-json-ld";
import { buildWineFaq } from "@/lib/wine-analysis";
import { valueScoreInputFromWine } from "@/lib/scoring";
import type { WineWithRelations } from "@/types";

const NOW = new Date();
const FRESH = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
const STALE = new Date(
  NOW.getTime() - (PUBLIC_PRICE_MAX_AGE_HOURS + 1) * 60 * 60 * 1000,
).toISOString();
const PROFITSHARE = "https://l.profitshare.ro/l/16919669";
const PROFITSHARE_2 = "https://l.profitshare.ro/l/16919670";
const EMAG_GENERIC =
  "https://www.emag.ro/vin-test/pd/ABC123/?ref=ps&emag_click_id=tracking";
const AUCHAN = "https://www.auchan.ro/vin-test";

function makeWine(overrides: Partial<WineWithRelations> = {}): WineWithRelations {
  const links = (overrides.affiliateLinks ?? []).map((link) => ({
    wineSlug: "test-wine-2022",
    bottleSizeMl: 750,
    vintage: 2022,
    ...link,
  }));
  return {
    id: 1,
    slug: "test-wine-2022",
    name: "Test Wine 0.75L",
    vintage: 2022,
    type: "red",
    sweetness: "sec",
    priceAvg: null,
    currentPrice: null,
    lowestPrice30d: null,
    priceHistory: [],
    availability: [],
    valueScore: 80,
    overpricedRisk: "low",
    imageUrl: "https://example.com/wine.jpg",
    imageSource: "manual",
    imageAlt: "Test Wine",
    winery: null,
    region: null,
    ...overrides,
    affiliateLinks: links,
  } as unknown as WineWithRelations;
}

describe("strict Profitshare URL provenance", () => {
  it("accepts an actual Profitshare campaign link", () => {
    expect(isQualifyingProfitshareUrl(PROFITSHARE)).toBe(true);
    expect(hasAffiliateTracking(PROFITSHARE)).toBe(true);
  });

  it("rejects generic retailer tracking and lookalike hosts", () => {
    expect(isQualifyingProfitshareUrl(EMAG_GENERIC)).toBe(false);
    expect(isQualifyingProfitshareUrl("https://profitshare.ro/l/")).toBe(false);
    expect(isQualifyingProfitshareUrl("https://l.profitshare.ro/l/12")).toBe(
      false,
    );
    expect(
      isQualifyingProfitshareUrl("https://l.profitshare.ro.evil.test/l/1234"),
    ).toBe(false);
    expect(hasAffiliateTracking(EMAG_GENERIC)).toBe(false);
  });

  it("does not expose a malformed Profitshare URL through legacy purchase helpers", () => {
    expect(
      resolveAffiliatePurchaseUrl({
        sourceUrl: "https://profitshare.ro/l/",
        affiliateLinks: [],
        availability: [],
      }),
    ).toBeNull();
    expect(
      resolveAffiliatePurchaseUrl({
        sourceUrl: null,
        affiliateLinks: [{ url: "https://profitshare.ro.evil.test/l/1234" }],
        availability: [{ url: "https://l.profitshare.ro/l/16919669" }],
      }),
    ).toBe("https://l.profitshare.ro/l/16919669");
  });
});

describe("canonical public price resolver", () => {
  it("shows a fresh price for a matching eMAG Profitshare offer", () => {
    const wine = makeWine({
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          priceRon: 65,
          checkedAt: FRESH,
          inStock: true,
        },
      ],
    });

    const pricing = resolvePublicPrice(wine, { now: NOW });
    expect(pricing.status).toBe("verified");
    expect(pricing.displayPrice).toBe(65);
    expect(pricing.bestOffer?.url).toBe(PROFITSHARE);
    expect(resolveWineDisplayPrice(wine, NOW)).toBe(65);
  });

  it("does not show a non-affiliate Auchan price", () => {
    const wine = makeWine({
      currentPrice: 50,
      priceAvg: 50,
      availability: [
        {
          retailer: "Auchan",
          url: AUCHAN,
          priceRon: 50,
          inStock: true,
          lastCheckedAt: FRESH,
        },
      ],
    });

    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
    expect(resolveWineDisplayPrice(wine, NOW)).toBeNull();
  });

  it("does not marry a non-affiliate price to an unrelated Profitshare link", () => {
    const wine = makeWine({
      currentPrice: 49,
      priceAvg: 49,
      affiliateLinks: [{ retailer: "eMAG.ro", url: PROFITSHARE }],
      availability: [
        {
          retailer: "eMAG.ro",
          url: AUCHAN,
          priceRon: 49,
          lastCheckedAt: FRESH,
        },
      ],
    });

    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
  });

  it("rejects a generic tracked URL with a fresh price", () => {
    const wine = makeWine({
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: EMAG_GENERIC,
          priceRon: 40,
          checkedAt: FRESH,
        },
      ],
    });

    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
  });

  it("does not show a Profitshare link without a price", () => {
    const wine = makeWine({
      affiliateLinks: [{ retailer: "eMAG.ro", url: PROFITSHARE }],
    });

    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
  });

  it("does not show a stale Profitshare price", () => {
    const wine = makeWine({
      affiliateLinks: [
        { retailer: "eMAG.ro", url: PROFITSHARE, priceRon: 65, checkedAt: STALE },
      ],
    });

    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
  });

  it("does not show an old currentPrice without a qualifying offer", () => {
    const wine = makeWine({
      currentPrice: 65,
      priceAvg: 65,
      lowestPrice30d: 60,
      priceHistory: [
        { date: FRESH, price: 65, source: AUCHAN },
        { date: STALE, price: 60, source: AUCHAN },
      ],
    });

    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
  });

  it("shows only qualified merchants and never mixes A price with B link", () => {
    const wine = makeWine({
      availability: [
        {
          retailer: "Auchan",
          url: AUCHAN,
          priceRon: 10,
          lastCheckedAt: FRESH,
        },
      ],
      affiliateLinks: [
        {
          retailer: "Carrefour.ro",
          url: PROFITSHARE_2,
          priceRon: 45,
          checkedAt: FRESH,
        },
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          priceRon: 50,
          checkedAt: FRESH,
        },
      ],
    });

    const pricing = resolvePublicPrice(wine, { now: NOW });
    expect(pricing.offers.map((offer) => offer.retailer)).toEqual([
      "Carrefour.ro",
      "eMAG.ro",
    ]);
    expect(pricing.displayPrice).toBe(45);
    expect(pricing.offers.every((offer) => offer.url !== AUCHAN)).toBe(true);
  });

  it("can use a same-offer Profitshare price observation from history", () => {
    const wine = makeWine({
      affiliateLinks: [{ retailer: "eMAG.ro", url: PROFITSHARE }],
      priceHistory: [{ date: FRESH, price: 33, source: PROFITSHARE }],
    });

    const pricing = resolvePublicPrice(wine, { now: NOW });
    expect(pricing.status).toBe("verified");
    expect(pricing.displayPrice).toBe(33);
  });

  it("rejects mismatched bottle size and vintage", () => {
    const sizeMismatch = makeWine({
      name: "Test Wine 1.5L",
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          priceRon: 65,
          checkedAt: FRESH,
          bottleSizeMl: 750,
        },
      ],
    });
    expect(resolvePublicPrice(sizeMismatch, { now: NOW }).status).toBe(
      "unavailable",
    );

    const vintageMismatch = makeWine({
      vintage: 2021,
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          priceRon: 65,
          checkedAt: FRESH,
          vintage: 2022,
        },
      ],
    });
    expect(resolvePublicPrice(vintageMismatch, { now: NOW }).status).toBe(
      "unavailable",
    );
  });

  it("requires exact product slug, bottle volume and applicable vintage", () => {
    const wine = makeWine();
    wine.affiliateLinks = [
      {
        retailer: "eMAG.ro",
        url: PROFITSHARE,
        priceRon: 65,
        checkedAt: FRESH,
      },
    ];
    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");

    wine.affiliateLinks = [
      {
        retailer: "eMAG.ro",
        url: PROFITSHARE,
        priceRon: 65,
        checkedAt: FRESH,
        wineSlug: "another-product",
        bottleSizeMl: 750,
        vintage: 2022,
      },
    ];
    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");

    wine.affiliateLinks = [
      {
        retailer: "eMAG.ro",
        url: PROFITSHARE,
        priceRon: 65,
        checkedAt: FRESH,
        wineSlug: "test-wine-2022",
        vintage: 2022,
      },
    ];
    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
  });


  it("accepts a current verified exact-product offer without a volume in the wine name", () => {
    const slug = "cramele-recas-explicit-sauvignon-blanc-2025";
    const wine = makeWine({
      slug,
      name: "EXPLICIT Sauvignon Blanc",
      vintage: 2025,
      affiliateLinks: [{
        retailer: "eMAG.ro",
        url: PROFITSHARE,
        merchantUrl: "https://www.emag.ro/vin-explicit-0-75l/pd/DLBLPY2BM/",
        merchantProductId: "DLBLPY2BM",
        productKey: slug,
        wineSlug: slug,
        bottleSizeMl: undefined,
        vintage: 2025,
        priceRon: 34,
        checkedAt: FRESH,
        verificationStatus: "verified",
      }],
    });
    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBe(34);
    wine.affiliateLinks[0]!.merchantProductId = "WRONG";
    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBeNull();
    wine.affiliateLinks[0]!.merchantProductId = "DLBLPY2BM";
    wine.affiliateLinks[0]!.verificationStatus = "unverified";
    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBeNull();
    wine.affiliateLinks[0]!.verificationStatus = "verified";
    wine.name = "EXPLICIT Sauvignon Blanc 0.75L";
    wine.affiliateLinks[0]!.bottleSizeMl = 1000;
    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBeNull();
  });


  it("recovers a verified offer hidden by old unproven out-of-stock parsing", () => {
    const slug = "cramele-recas-explicit-sauvignon-blanc-2025";
    const link = {
      retailer: "eMAG.ro",
      url: PROFITSHARE,
      merchantUrl: "https://www.emag.ro/vin-explicit/pd/DLBLPY2BM/",
      merchantProductId: "DLBLPY2BM",
      wineSlug: slug,
      vintage: 2025,
      priceRon: 34,
      checkedAt: FRESH,
      verificationStatus: "verified" as const,
      inStock: false,
    };
    const wine = makeWine({
      slug,
      name: "EXPLICIT Sauvignon Blanc",
      vintage: 2025,
      affiliateLinks: [link],
    });
    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBe(34);
    wine.affiliateLinks[0]!.stockEvidence = "structured_product";
    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBeNull();
    wine.affiliateLinks[0]!.stockEvidence = undefined;
    wine.affiliateLinks[0]!.verificationStatus = "unverified";
    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBeNull();
  });

  it("rejects an offer known to be unavailable", () => {
    const wine = makeWine({
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          priceRon: 65,
          checkedAt: FRESH,
          inStock: false,
        },
      ],
    });
    expect(resolvePublicPrice(wine, { now: NOW }).status).toBe("unavailable");
  });
});

describe("public projection and structured data", () => {
  it("strips every non-qualified price and price-dependent score", () => {
    const wine = makeWine({
      currentPrice: 65,
      priceAvg: 65,
      lowestPrice30d: 60,
      priceHistory: [{ date: FRESH, price: 65, source: AUCHAN }],
      availability: [
        { retailer: "Auchan", url: AUCHAN, priceRon: 65, lastCheckedAt: FRESH },
      ],
      affiliateLinks: [{ retailer: "eMAG.ro", url: PROFITSHARE }],
    });

    const publicWine = sanitizeWineForPublic(wine, NOW);
    expect(publicWine.currentPrice).toBeNull();
    expect(publicWine.priceAvg).toBeNull();
    expect(publicWine.lowestPrice30d).toBeNull();
    expect(publicWine.priceHistory).toEqual([]);
    expect(publicWine.affiliateLinks).toEqual([]);
    expect(publicWine.availability).toEqual([]);
    expect(publicWine.valueScore).toBeNull();
    expect(publicWine.overpricedRisk).toBeNull();
  });

  it("keeps only qualified offers and suppresses JSON-LD offers without one", () => {
    const unqualified = makeWine({
      currentPrice: 49,
      priceAvg: 49,
      affiliateLinks: [{ retailer: "eMAG.ro", url: PROFITSHARE }],
    });
    const node = buildWineProductJsonLd(unqualified);
    expect(node.offers).toBeUndefined();
    expect(resolveWineOfferPrice(unqualified)).toBeNull();

    const qualified = makeWine({
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          priceRon: 65,
          checkedAt: FRESH,
        },
      ],
    });
    expect(resolveWineOfferPrice(qualified)).toBe(65);
    expect(buildWineProductJsonLd(qualified).offers).toMatchObject({
      price: 65,
      priceCurrency: "RON",
    });

    const publicWine = sanitizeWineForPublic(qualified, NOW);
    expect(publicWine.priceAvg).toBe(65);
    expect(publicWine.valueScore).toBe(80);
    expect(publicWine.affiliateLinks).toHaveLength(1);
    expect(publicWine.affiliateLinks[0]?.url).toBe(PROFITSHARE);
  });


  it("keeps a fresh verified eMAG Profitshare price through the entire public projection", () => {
    const slug = "cramele-recas-explicit-sauvignon-blanc-2025";
    const wine = makeWine({
      slug,
      name: "EXPLICIT Sauvignon Blanc",
      vintage: 2025,
      currentPrice: null,
      affiliateLinks: [{
        retailer: "eMAG.ro",
        url: PROFITSHARE,
        merchantUrl: "https://www.emag.ro/vin-explicit-sauvignon-blanc-0-75l/pd/DLBLPY2BM/",
        merchantProductId: "DLBLPY2BM",
        wineSlug: slug,
        productKey: slug,
        bottleSizeMl: undefined,
        vintage: 2025,
        priceRon: 34,
        checkedAt: FRESH,
        verificationStatus: "verified",
        inStock: false,
        stockEvidence: undefined,
      }],
    });

    expect(resolvePublicPrice(wine, { now: NOW }).displayPrice).toBe(34);
    const publicWine = sanitizeWineForPublic(wine, NOW);
    expect(publicWine.affiliateLinks).toHaveLength(1);
    expect(publicWine.affiliateLinks[0]).toMatchObject({
      merchantProductId: "DLBLPY2BM",
      verificationStatus: "verified",
      url: PROFITSHARE,
    });
    expect(resolvePublicPrice(publicWine, { now: NOW }).displayPrice).toBe(34);
    expect(buildWinePriceViewModel(publicWine, NOW).displayPrice).toBe(34);
    expect(buildWinePriceViewModel(publicWine, NOW).purchaseLink?.url).toBe(PROFITSHARE);
  });

  it("never promotes an unverified merchant mapping during projection", () => {
    const wine = makeWine({
      name: "Unnamed wine",
      affiliateLinks: [{
        retailer: "eMAG.ro",
        url: PROFITSHARE,
        merchantUrl: "https://www.emag.ro/wine/pd/DLBLPY2BM/",
        merchantProductId: "DLBLPY2BM",
        wineSlug: "test-wine-2022",
        priceRon: 34,
        checkedAt: FRESH,
        vintage: 2022,
        verificationStatus: "unverified",
      }],
    });
    const publicWine = sanitizeWineForPublic(wine, NOW);
    expect(publicWine.affiliateLinks).toEqual([]);
    expect(buildWinePriceViewModel(publicWine, NOW).displayPrice).toBeNull();
  });

  it("marks a missing market price as insufficient for Value Score", () => {
    const input = valueScoreInputFromWine(
      makeWine({ currentPrice: null, priceAvg: null }),
    );
    expect(input.priceDataStatus).toBe("insufficient");
  });

  it("never leaks a non-affiliate price through metadata or FAQ", () => {
    const wine = makeWine({
      currentPrice: 65,
      priceAvg: 65,
      affiliateLinks: [{ retailer: "eMAG.ro", url: EMAG_GENERIC }],
    });

    const metadata = buildWineMetadataDescription(wine, "en");
    expect(metadata).not.toContain("RON");
    expect(buildWineFaq(wine, "en")[0]?.answer).toContain(
      "do not currently have a qualified Profitshare offer",
    );
  });

  it("includes the qualified offer price in metadata", () => {
    const wine = makeWine({
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          priceRon: 65,
          checkedAt: FRESH,
        },
      ],
    });
    expect(buildWineMetadataDescription(wine, "en")).toContain("65 RON");
  });

  it("returns no purchase CTA and no price for unqualified wines", () => {
    const wine = makeWine({
      currentPrice: 65,
      priceAvg: 65,
      affiliateLinks: [{ retailer: "eMAG.ro", url: EMAG_GENERIC }],
    });
    const pricing = buildWinePriceViewModel(wine, NOW);
    expect(pricing.status).toBe("unavailable");
    expect(pricing.displayPrice).toBeNull();
    expect(pricing.purchaseLink).toBeNull();
    expect(pricing.verifyPriceUrl).toBeNull();
  });
});
