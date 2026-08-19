import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  aggregateMarketPriceEstimate,
  buildMarketPriceMonetizationView,
  extractMarketPriceObservation,
  independentQualifiedObservations,
  marketPriceBudgetEligibility,
  normalizeMarketPriceDomain,
  type MarketPriceObservation,
  type MarketPriceWineTarget,
} from "@/lib/market-price-discovery";
import { simulateValueScoreWithMarketEstimate } from "@/lib/market-price-simulation";
import {
  assertPrompt26ReadOnly,
  boundAgentCandidates,
  parsePriceDiscoveryCli,
} from "@/scripts/discover-missing-prices";
import type { WineWithRelations } from "@/types";

const TARGET: MarketPriceWineTarget = {
  wineId: 242,
  slug: "balla-geza-feteasca-neagra-2022",
  wineName: "Fetească Neagră",
  wineryName: "Balla Geza",
  vintage: 2022,
  volumeMl: 750,
};

function productHtml(input: {
  title?: string;
  price?: number;
  currency?: string;
  availability?: string;
  volume?: string;
  body?: string;
}): string {
  const title =
    input.title ?? "Balla Geza Fetească Neagră 2022, 750 ml";
  const price = input.price ?? 59;
  const availability = input.availability ?? "https://schema.org/InStock";
  return `<!doctype html>
<html lang="ro">
<head>
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <script type="application/ld+json">
    {
      "@type": "Product",
      "name": "${title}",
      "offers": {
        "@type": "Offer",
        "price": "${price}",
        "priceCurrency": "${input.currency ?? "RON"}",
        "availability": "${availability}"
      }
    }
  </script>
</head>
<body>
  <h1>${title}</h1>
  <p>${input.volume ?? "750 ml"}</p>
  <p>${input.body ?? "În stoc"}</p>
</body>
</html>`;
}

function observation(
  domain: string,
  price: number,
  overrides: Partial<MarketPriceObservation> = {},
): MarketPriceObservation {
  return extractMarketPriceObservation({
    target: TARGET,
    sourceUrl: `https://${domain}/balla-geza-feteasca-neagra-2022`,
    html: productHtml({ price }),
    observedAt: "2026-08-19T10:00:00.000Z",
    ...overrides,
  });
}

function wineFixture(): WineWithRelations {
  return {
    id: TARGET.wineId,
    slug: TARGET.slug,
    name: TARGET.wineName,
    type: "red",
    sweetness: "sec",
    status: "verified",
    vintage: TARGET.vintage,
    priceAvg: null,
    currentPrice: null,
    valueScore: 66,
    grapeVarieties: [{ name: "Fetească Neagră" }],
    medals: [],
    availability: [],
    affiliateLinks: [],
    priceHistory: [],
    foodPairings: [],
    foodPairingNotes: [],
    dessertPairings: [],
    recommendedOccasions: [],
    thingsYouShouldKnow: [],
    winery: { id: 1, name: "Balla Geza", slug: "balla-geza" },
    region: { id: 1, name: "Miniș", slug: "minis" },
  } as unknown as WineWithRelations;
}

describe("Prompt 26 deterministic observation extraction", () => {
  it("keeps source hashes idempotent when observedAt changes", () => {
    const first = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/produs",
      html: productHtml({ price: 59 }),
      observedAt: "2026-08-01T00:00:00.000Z",
    });
    const second = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/produs",
      html: productHtml({ price: 59 }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(first.sourceHash).toBe(second.sourceHash);
    expect(first.observedAt).not.toBe(second.observedAt);
    expect(first).toMatchObject({
      observedPriceRon: 59,
      identityMatch: "EXACT",
      vintageMatch: "EXACT",
      volumeMl: 750,
      qualification: "QUALIFIED",
    });
  });

  it("records promotions and out-of-stock availability without claiming stock", () => {
    const result = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/produs",
      html: productHtml({
        body: "Preț vechi: 69 lei. Preț promoțional: 49 lei. Stoc epuizat.",
        availability: "https://schema.org/OutOfStock",
      }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(result).toMatchObject({
      observedPriceRon: 49,
      originalPriceRon: 69,
      salePriceRon: 49,
      priceType: "PROMOTIONAL",
      availabilitySignal: "OUT_OF_STOCK",
      qualification: "QUALIFIED",
    });
  });

  it("extracts the active Bringo-style discounted price", () => {
    const result = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://www.bringo.ro/ro/stores/example/product",
      html: productHtml({
        body: "28,29 RON -25% De la 21,29 RON",
      }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(result).toMatchObject({
      observedPriceRon: 21.29,
      originalPriceRon: 28.29,
      salePriceRon: 21.29,
      priceType: "PROMOTIONAL",
      qualification: "QUALIFIED",
    });
  });

  it("keeps a different vintage as reference only", () => {
    const result = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/produs",
      html: productHtml({
        title: "Balla Geza Fetească Neagră 2023, 750 ml",
      }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(result.vintageMatch).toBe(
      "REFERENCE_ONLY_DIFFERENT_VINTAGE",
    );
    expect(result.qualification).toBe("REFERENCE_ONLY");
    expect(result.exclusionReason).toBe("DIFFERENT_VINTAGE");
  });

  it("rejects obvious retailer placeholder prices", () => {
    const result = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/produs",
      html: productHtml({ price: 9999 }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });
    expect(result.qualification).toBe("EXCLUDED");
    expect(result.exclusionReason).toBe(
      "PRICE_PLACEHOLDER_OR_IMPLAUSIBLE",
    );
  });

  it("rejects wrong volume, bundles and wrong product identity", () => {
    const wrongVolume = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/produs-volum",
      html: productHtml({
        title: "Balla Geza Fetească Neagră 2022, 1500 ml",
        volume: "1500 ml",
      }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });
    const bundle = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/pachet",
      html: productHtml({
        title: "Pachet Balla Geza Fetească Neagră 2022, 6 x 750 ml",
        body: "Pachet 6 x 750 ml, în stoc",
      }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });
    const wrongWine = extractMarketPriceObservation({
      target: TARGET,
      sourceUrl: "https://shop.ro/merlot",
      html: productHtml({
        title: "Balla Geza Merlot 2022, 750 ml",
      }),
      observedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(wrongVolume.exclusionReason).toBe("WRONG_BOTTLE_VOLUME");
    expect(bundle.exclusionReason).toBe("BUNDLE_OR_GIFT_PACKAGE");
    expect(wrongWine.exclusionReason).toBe("WRONG_PRODUCT_IDENTITY");
  });

  it("normalizes retailer independence and keeps one URL per domain", () => {
    expect(normalizeMarketPriceDomain("https://www.shop.example.ro/a")).toBe(
      "example.ro",
    );
    const first = observation("shop.ro", 59);
    const duplicate = observation("www.shop.ro", 61);
    const independent = observation("alt-shop.ro", 60);
    expect(
      independentQualifiedObservations([first, duplicate, independent]),
    ).toHaveLength(2);
  });
});

describe("Prompt 26 robust estimate qualification", () => {
  it("uses median for three consistent independent sources", () => {
    const result = aggregateMarketPriceEstimate(
      TARGET,
      [
        observation("shop1.ro", 52),
        observation("shop2.ro", 59),
        observation("shop3.ro", 61),
      ],
      "2026-08-19T12:00:00.000Z",
    );

    expect(result).toMatchObject({
      status: "ESTIMATE_STRONG",
      estimatedMarketPrice: 59,
      sourceCount: 3,
      minPriceRon: 52,
      maxPriceRon: 61,
      medianPriceRon: 59,
      meanPriceRon: 57.33,
      confidence: "strong",
    });
  });

  it("classifies two sources as limited and one as single-source only", () => {
    const limited = aggregateMarketPriceEstimate(
      TARGET,
      [observation("shop1.ro", 52), observation("shop2.ro", 58)],
      "2026-08-19T12:00:00.000Z",
    );
    const single = aggregateMarketPriceEstimate(
      TARGET,
      [observation("shop1.ro", 52)],
      "2026-08-19T12:00:00.000Z",
    );

    expect(limited).toMatchObject({
      status: "ESTIMATE_LIMITED",
      estimatedMarketPrice: 55,
      confidence: "limited",
    });
    expect(single).toMatchObject({
      status: "SINGLE_SOURCE_ONLY",
      estimatedMarketPrice: null,
    });
  });

  it("does not call an entirely undated vintage set strong", () => {
    const observations = ["shop1.ro", "shop2.ro", "shop3.ro"].map(
      (domain, index) =>
        extractMarketPriceObservation({
          target: TARGET,
          sourceUrl: `https://${domain}/produs`,
          html: productHtml({
            title: "Balla Geza Fetească Neagră, 750 ml",
            price: 54 + index,
          }),
          observedAt: "2026-08-19T12:00:00.000Z",
        }),
    );
    const result = aggregateMarketPriceEstimate(
      TARGET,
      observations,
      "2026-08-19T12:00:00.000Z",
    );

    expect(result.sourceCount).toBe(3);
    expect(result.status).toBe("ESTIMATE_LIMITED");
  });

  it("routes 42, 45 and 110 to high-spread review", () => {
    const result = aggregateMarketPriceEstimate(
      TARGET,
      [
        observation("shop1.ro", 42),
        observation("shop2.ro", 45),
        observation("shop3.ro", 110),
      ],
      "2026-08-19T12:00:00.000Z",
    );

    expect(result.status).toBe("HIGH_SPREAD_REVIEW");
    expect(result.estimatedMarketPrice).toBeNull();
    expect(result.medianPriceRon).toBe(45);
    expect(result.spreadPercent).toBeGreaterThan(40);
    expect(result.potentialOutlierHashes).toHaveLength(1);
  });

  it("does not treat marketplace-only evidence as strong", () => {
    const result = aggregateMarketPriceEstimate(
      TARGET,
      [
        observation("emag.ro", 52),
        observation("olx.ro", 53),
        observation("okazii.ro", 54),
      ],
      "2026-08-19T12:00:00.000Z",
    );
    expect(result.status).not.toBe("ESTIMATE_STRONG");
  });
});

describe("Prompt 26 simulations and safety", () => {
  it("keeps estimated price and monetizable availability independent", () => {
    const estimate = aggregateMarketPriceEstimate(
      TARGET,
      [observation("shop1.ro", 52), observation("shop2.ro", 58)],
      "2026-08-19T12:00:00.000Z",
    );
    const withOffer = buildMarketPriceMonetizationView({
      hasProfitshareOffer: true,
      estimate,
    });
    const withoutOffer = buildMarketPriceMonetizationView({
      hasProfitshareOffer: false,
      estimate,
    });
    const noEstimate = buildMarketPriceMonetizationView({
      hasProfitshareOffer: false,
      estimate: null,
    });

    expect(withOffer).toMatchObject({
      priceCopy: "Preț estimativ: ~55 lei",
      primaryAction: "PARTNER_OFFER",
      sourceUrlsPublic: false,
    });
    expect(withoutOffer.primaryAction).toBe("MONETIZABLE_ALTERNATIVES");
    expect(noEstimate.priceCopy).toBe("Preț indisponibil");
    expect(JSON.stringify([withOffer, withoutOffer, noEstimate])).not.toContain(
      "shop1.ro",
    );
  });

  it("simulates Value in memory without recommending activation", () => {
    const estimate = aggregateMarketPriceEstimate(
      TARGET,
      [
        observation("shop1.ro", 52),
        observation("shop2.ro", 58),
        observation("shop3.ro", 60),
      ],
      "2026-08-19T12:00:00.000Z",
    );
    const wine = wineFixture();
    const before = JSON.stringify(wine);
    const simulation = simulateValueScoreWithMarketEstimate(wine, estimate);

    expect(simulation).toMatchObject({
      estimatedPriceRon: 58,
      priceConfidence: "estimated_strong",
      valueActivationRecommended: false,
    });
    expect(JSON.stringify(wine)).toBe(before);
  });

  it("keeps single-source estimates out of hard budgets", () => {
    expect(marketPriceBudgetEligibility("ESTIMATE_STRONG")).toBe(
      "ELIGIBLE_LOWER_CONFIDENCE",
    );
    expect(marketPriceBudgetEligibility("ESTIMATE_LIMITED")).toBe(
      "ELIGIBLE_CAUTIOUS",
    );
    expect(marketPriceBudgetEligibility("SINGLE_SOURCE_ONLY")).toBe(
      "INELIGIBLE",
    );
  });

  it("hard-refuses apply and bounds agent-cache candidates", () => {
    expect(() =>
      assertPrompt26ReadOnly(parsePriceDiscoveryCli(["--apply"])),
    ).toThrow("qualification-only");
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      wineId: TARGET.wineId,
      slug: TARGET.slug,
      sourceUrl: `https://shop${index}.ro/produs`,
      query: "test",
      discoveredAt: "2026-08-19T00:00:00.000Z",
    }));
    expect(
      boundAgentCandidates(candidates, new Set([TARGET.wineId])),
    ).toHaveLength(8);
  });

  it("contains no write path or price-tracker dependency", async () => {
    const [core, simulation, script] = await Promise.all([
      readFile(new URL("./market-price-discovery.ts", import.meta.url), "utf8"),
      readFile(new URL("./market-price-simulation.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../scripts/discover-missing-prices.ts", import.meta.url),
        "utf8",
      ),
    ]);
    const implementation = `${core}\n${simulation}\n${script}`;

    expect(implementation).not.toContain("price-tracker");
    expect(implementation).not.toMatch(
      /db\.(?:insert|update|delete)|\.update\(wines\)|\.insert\(wines\)|\.delete\(wines\)/,
    );
    expect(implementation).not.toMatch(
      /priceAvg:\s*estimate|currentPrice:\s*estimate/,
    );
  });
});
