import { describe, expect, it } from "vitest";
import { diagnoseAvailability } from "@/lib/sommelier-availability";
import { extractBudgetConstraint } from "@/lib/sommelier-budget";
import { buildAvailabilityFallback } from "@/lib/sommelier-fallback";
import { detectRetailer } from "@/lib/sommelier-retailer";
import type { WineWithRelations } from "@/types";

const wineWithoutPrice = {
  id: 1,
  slug: "catalog-wine",
  name: "Catalog Wine 0.75L",
  type: "red",
  sweetness: "sec",
  vintage: null,
  affiliateLinks: [],
  priceHistory: [],
  currentPrice: null,
  priceAvg: null,
} as unknown as WineWithRelations;

function answerFor(allWines: WineWithRelations[], budgetText = "sub 30 de lei") {
  const budget = extractBudgetConstraint(budgetText);
  const retailer = detectRetailer("Mega");
  const diagnosis = diagnoseAvailability({ allWines, budget, retailer });
  return {
    diagnosis,
    text: buildAvailabilityFallback({ diagnosis, budget, retailer, locale: "ro" }),
  };
}

describe("sommelier safe fallback", () => {
  it("does not insult the budget, suggest beer or raise the price", () => {
    const { text } = answerFor([wineWithoutPrice]);
    expect(text).toContain("Mega Image");
    expect(text).toContain("30 lei");
    expect(text).toContain("Profitshare");
    expect(text).not.toMatch(/bere|parizer|ridicol|penibil/i);
    expect(text).not.toMatch(/40|45/);
    expect(text).not.toMatch(/nu există vinuri bune|nu exista vinuri bune/i);
    expect(text).not.toContain("Value Score");
  });

  it("explains missing retailer stock data without inventing availability", () => {
    const { text } = answerFor([wineWithoutPrice]);
    expect(text).toContain("date licențiate");
    expect(text).toContain("stoc");
    expect(text).not.toMatch(/este în stoc la Mega|disponibil la Mega/i);
  });

  it("distinguishes no price from a budget exclusion", () => {
    const noPrice = answerFor([wineWithoutPrice]);
    expect(noPrice.diagnosis.primary).toBe("no_verified_price");
    expect(noPrice.text).toContain("ofertă Profitshare");

    const priced = {
      ...wineWithoutPrice,
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: "https://l.profitshare.ro/l/fallbacktest",
          wineSlug: "catalog-wine",
          productKey: "catalog-wine",
          bottleSizeMl: 750,
          vintage: null,
          priceRon: 45,
          checkedAt: new Date().toISOString(),
          inStock: true,
        },
      ],
    };
    const excluded = answerFor([priced]);
    expect(excluded.diagnosis.primary).toBe("budget_excludes");
    expect(excluded.text.toLowerCase()).toContain("nu îți urc bugetul");
  });

  it("does not leave internal markers or slugs in visible text", () => {
    const { text } = answerFor([wineWithoutPrice]);
    expect(text).not.toMatch(/RECOMMENDED_SLUGS|slug:|wineSlug|\{/i);
  });
});
