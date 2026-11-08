import { describe, expect, it } from "vitest";
import { buildAffiliateLinks } from "@/lib/affiliate-import";

const EMAG =
  "https://www.emag.ro/vin-recas-explicit-roze-0-75l-rec-260/pd/D4BLPY2BM/";
const PROFITSHARE = "https://l.profitshare.ro/l/16139555";

describe("import affiliate triple", () => {
  it("preserves winery, eMAG and Profitshare URLs independently", () => {
    const links = buildAffiliateLinks({
      slug: "cramele-recas-explicit-roze-2025",
      producer: "Cramele Recas",
      sourceUrl: PROFITSHARE,
      emagUrl: `${EMAG}?ref=ps`,
      profitshareUrl: PROFITSHARE,
      bottleSizeMl: 750,
      vintage: 2025,
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      retailer: "eMAG.ro",
      url: PROFITSHARE,
      merchantUrl: EMAG,
      merchantProductId: "D4BLPY2BM",
      productKey: "cramele-recas-explicit-roze-2025",
      bottleSizeMl: 750,
      vintage: 2025,
      currency: "RON",
      verificationStatus: "unverified",
    });
    expect(links[0]?.priceRon).toBeUndefined();
    expect(links[0]?.checkedAt).toBeUndefined();
  });

  it("does not turn a legacy source URL into a fresh public price", () => {
    const links = buildAffiliateLinks({
      slug: "legacy-wine",
      producer: "Legacy Producer",
      sourceUrl: "https://example.com/wine",
      emagUrl: null,
      profitshareUrl: null,
      bottleSizeMl: 750,
      vintage: null,
    });
    expect(links[0]).toMatchObject({ retailer: "Legacy Producer" });
    expect(links[0]?.priceRon).toBeUndefined();
    expect(links[0]?.checkedAt).toBeUndefined();
    expect(links[0]?.merchantUrl).toBeUndefined();
  });

  it("keeps a bare eMAG URL without affiliate URL non-public", () => {
    const links = buildAffiliateLinks({
      slug: "no-affiliate",
      producer: "Producer",
      sourceUrl: EMAG,
      emagUrl: EMAG,
      profitshareUrl: null,
      bottleSizeMl: 750,
      vintage: null,
    });
    expect(links[0]?.url).toBe(EMAG);
    expect(links[0]?.merchantUrl).toBeUndefined();
  });
});
