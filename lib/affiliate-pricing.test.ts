import { describe, expect, it } from "vitest";
import {
  evaluateSources,
  extractEmagProductId,
  normalizeEmagProductUrl,
  recoverAffiliateOffers,
  type PriceAuditWine,
} from "@/lib/affiliate-pricing";
import { resolvePublicPrice } from "@/lib/public-price";
import type { AffiliateLink } from "@/lib/schema";

const NOW = new Date();
const PROFITSHARE = "https://l.profitshare.ro/l/16139555";
const EMAG = "https://www.emag.ro/vin-recas-explicit-roze-0-75l-rec-260/pd/D4BLPY2BM/";

function wine(overrides: Partial<PriceAuditWine> = {}): PriceAuditWine {
  return {
    id: 1,
    slug: "cramele-recas-explicit-roze-2025",
    name: "EXPLICIT Roze 0.75L",
    status: "verified",
    sourceUrl: PROFITSHARE,
    producerPageUrl: "https://cramelerecas.ro/roze-explicit/",
    currentPrice: 51,
    priceAvg: 51,
    priceHistory: [],
    affiliateLinks: [
      {
        retailer: "eMAG.ro",
        url: EMAG,
        priceRon: 51,
        checkedAt: NOW.toISOString(),
      },
    ],
    ...overrides,
  };
}

describe("affiliate pricing recovery", () => {
  it("recovers the legacy eMAG + Profitshare triple without inventing URLs", () => {
    const audit = evaluateSources(wine(), NOW);
    expect(audit.producerUrl).toBe("https://cramelerecas.ro/roze-explicit/");
    expect(audit.emagUrl).toBe(EMAG);
    expect(audit.profitshareUrl).toBe(PROFITSHARE);
    expect(audit.merchantProductId).toBe("D4BLPY2BM");
    expect(audit.legacyUrlSwap).toBe(true);
    expect(audit.recoverable).toBe(true);
    expect(audit.offer?.productKey).toBe(wine().slug);
  });

  it("recovers a profitshare link when the eMAG product is in sourceUrl", () => {
    const audit = evaluateSources(
      wine({
        sourceUrl: EMAG,
        currentPrice: null,
        priceAvg: null,
        affiliateLinks: [
          { retailer: "eMAG.ro", url: PROFITSHARE, priceRon: 34 },
        ],
      }),
      NOW,
    );
    const offers = recoverAffiliateOffers(
      wine({
        sourceUrl: EMAG,
        currentPrice: null,
        priceAvg: null,
        affiliateLinks: [
          { retailer: "eMAG.ro", url: PROFITSHARE, priceRon: 34 },
        ],
      }),
    );
    expect(audit.recoverable).toBe(true);
    expect(audit.emagUrl).toBe(EMAG);
    expect(audit.profitshareUrl).toBe(PROFITSHARE);
    expect(audit.merchantProductId).toBe("D4BLPY2BM");
    expect(offers).toHaveLength(1);
    expect(offers[0].merchantProductId).toBe("D4BLPY2BM");
  });

  it("extracts the exact eMAG product ID and normalizes the URL", () => {
    expect(extractEmagProductId(EMAG)).toBe("D4BLPY2BM");
    expect(extractEmagProductId("https://www.emag.ro/search/vin/pd/D4BLPY2BM")).toBe(
      "D4BLPY2BM",
    );
    expect(extractEmagProductId("https://www.emag.ro/vin/pd/")).toBeNull();
    expect(normalizeEmagProductUrl(`${EMAG}?ref=ps`)).toBe(EMAG);
  });

  it("flags an exact product ID mismatch instead of combining offers", () => {
    const audit = evaluateSources(
      wine({
        affiliateLinks: [
          {
            retailer: "eMAG.ro",
            url: EMAG,
            merchantUrl: EMAG,
            merchantProductId: "D4BLPY2BN",
            productKey: "cramele-recas-explicit-roze-2025",
            priceRon: 51,
            checkedAt: NOW.toISOString(),
          },
        ],
      }),
      NOW,
    );
    expect(audit.manualCorrection).toBe(true);
    expect(audit.recoverable).toBe(false);
    expect(audit.cases).toContain("product_id_mismatch");
  });

  it("marks missing eMAG or affiliate metadata unavailable", () => {
    const audit = evaluateSources(
      wine({ sourceUrl: null, affiliateLinks: [], currentPrice: null, priceAvg: null }),
      NOW,
    );
    expect(audit.unavailable).toBe(true);
    expect(audit.recoverable).toBe(false);
    expect(audit.offer).toBeNull();
  });

  it("marks a stale price observation", () => {
    const audit = evaluateSources(
      wine({
        affiliateLinks: [
          {
            retailer: "eMAG.ro",
            url: EMAG,
            priceRon: 51,
            checkedAt: "2020-01-01T00:00:00.000Z",
          },
        ],
      }),
      NOW,
    );
    expect(audit.cases).toContain("stale_observation");
  });

  it("supports multiple independently mapped retailer offers for one wine", () => {
    const secondAffiliate = "https://l.profitshare.ro/l/16139556";
    const secondMerchant =
      "https://www.emag.ro/vin-recas-explicit-roze-0-75l-rec-261/pd/D4BLPY2BN/";
    const offers = recoverAffiliateOffers(
      wine({
        affiliateLinks: [
          {
            retailer: "eMAG.ro",
            url: PROFITSHARE,
            merchantUrl: EMAG,
            merchantProductId: "D4BLPY2BM",
            productKey: wine().slug,
            priceRon: 51,
            checkedAt: NOW.toISOString(),
          },
          {
            retailer: "eMAG.ro",
            url: secondAffiliate,
            merchantUrl: secondMerchant,
            merchantProductId: "D4BLPY2BN",
            productKey: wine().slug,
            priceRon: 53,
            checkedAt: NOW.toISOString(),
          },
        ],
      }),
    );
    expect(offers).toHaveLength(2);
    expect(offers.map((offer) => offer.merchantProductId)).toEqual([
      "D4BLPY2BM",
      "D4BLPY2BN",
    ]);
  });

  it("shows a public price only for an exact, verified, fresh link", () => {
    const publicWine = {
      ...wine(),
      vintage: null,
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE,
          merchantUrl: EMAG,
          merchantProductId: "D4BLPY2BM",
          productKey: wine().slug,
          bottleSizeMl: 750,
          vintage: null,
          priceRon: 51,
          checkedAt: NOW.toISOString(),
          verificationStatus: "verified",
        } satisfies AffiliateLink,
      ],
    };
    expect(resolvePublicPrice(publicWine, { now: NOW }).displayPrice).toBe(51);

    const mismatch = {
      ...publicWine,
      affiliateLinks: [
        { ...publicWine.affiliateLinks[0], merchantProductId: "D4BLPY2BN" },
      ],
    };
    expect(resolvePublicPrice(mismatch, { now: NOW }).displayPrice).toBeNull();
  });
});
