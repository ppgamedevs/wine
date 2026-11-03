import { describe, expect, it } from "vitest";
import { resolveApprovalPurchaseUrl } from "@/lib/wine-approval-cta";
import type { AffiliateLink } from "@/lib/schema";

const NOW = new Date("2026-11-03T12:00:00.000Z");
const FRESH = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();
const STALE = new Date(NOW.getTime() - 72 * 60 * 60 * 1000).toISOString();
const URL = "https://l.profitshare.ro/l/16919669";

function link(overrides: Partial<AffiliateLink> = {}): AffiliateLink {
  return {
    retailer: "eMAG.ro",
    url: URL,
    priceRon: 65,
    checkedAt: FRESH,
    inStock: true,
    wineSlug: "zestrea-muscat-ottonel-demisec-0-75l",
    bottleSizeMl: 750,
    vintage: 2022,
    ...overrides,
  } as AffiliateLink;
}

const wine = {
  slug: "zestrea-muscat-ottonel-demisec-0-75l",
  name: "Zestrea Muscat Ottonel Demisec 0.75L",
  vintage: 2022,
};

describe("approval email purchase CTA", () => {
  it("uses the canonical exact-product Profitshare offer", () => {
    expect(resolveApprovalPurchaseUrl({ ...wine, affiliateLinks: [link()] }, NOW)).toBe(
      URL,
    );
  });

  it("rejects missing identity, wrong volume, wrong vintage, stale and non-Profitshare links", () => {
    expect(
      resolveApprovalPurchaseUrl(
        { ...wine, affiliateLinks: [link({ wineSlug: undefined, bottleSizeMl: undefined })] },
        NOW,
      ),
    ).toBeNull();
    expect(
      resolveApprovalPurchaseUrl({ ...wine, affiliateLinks: [link({ bottleSizeMl: 1500 })] }, NOW),
    ).toBeNull();
    expect(
      resolveApprovalPurchaseUrl({ ...wine, affiliateLinks: [link({ vintage: 2021 })] }, NOW),
    ).toBeNull();
    expect(
      resolveApprovalPurchaseUrl({ ...wine, affiliateLinks: [link({ checkedAt: STALE })] }, NOW),
    ).toBeNull();
    expect(
      resolveApprovalPurchaseUrl(
        {
          ...wine,
          affiliateLinks: [link({ url: "https://www.emag.ro/vin-test/pd/ABC123/?ref=ps" })],
        },
        NOW,
      ),
    ).toBeNull();
  });
});
