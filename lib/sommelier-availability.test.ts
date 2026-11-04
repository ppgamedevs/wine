import { describe, expect, it } from "vitest";
import { extractBudgetConstraint, priceSatisfiesBudget } from "@/lib/sommelier-budget";
import { diagnoseAvailability } from "@/lib/sommelier-availability";
import { detectRetailer } from "@/lib/sommelier-retailer";
import type { WineWithRelations } from "@/types";

const NOW = new Date();

function wine(price: number | null, overrides: Record<string, unknown> = {}): WineWithRelations {
  const link =
    price == null
      ? []
      : [
          {
            retailer: "eMAG.ro",
            url: "https://l.profitshare.ro/l/availabilitytest",
            wineSlug: "test-wine-0-75l",
            productKey: "test-wine-0-75l",
            bottleSizeMl: 750,
            vintage: null,
            priceRon: price,
            checkedAt: NOW.toISOString(),
            inStock: true,
          },
        ];
  return {
    id: 1,
    slug: "test-wine-0-75l",
    name: "Test Wine 0.75L",
    type: "red",
    sweetness: "sec",
    vintage: null,
    affiliateLinks: link,
    priceHistory: [],
    ...overrides,
  } as unknown as WineWithRelations;
}

describe("sommelier availability diagnosis", () => {
  it("distinguishes an empty catalog", () => {
    const result = diagnoseAvailability({
      allWines: [],
      budget: extractBudgetConstraint("sub 30 de lei"),
      retailer: detectRetailer("Mega"),
    });
    expect(result.primary).toBe("catalog_empty");
    expect(result.cases).toContain("retailer_unavailable");
  });

  it("distinguishes no verified price from no good wine", () => {
    const result = diagnoseAvailability({
      allWines: [wine(null)],
      budget: extractBudgetConstraint("sub 30 de lei"),
      retailer: detectRetailer("Mega"),
    });
    expect(result.primary).toBe("no_verified_price");
    expect(result.hasVerifiedPrice).toBe(false);
    expect(result.cases).toContain("retailer_unavailable");
  });

  it("recognizes a verified in-budget offer while keeping retailer stock unverified", () => {
    const result = diagnoseAvailability({
      allWines: [wine(25)],
      budget: extractBudgetConstraint("sub 30 de lei"),
      retailer: detectRetailer("Mega"),
    });
    expect(result.hasInBudgetVerifiedPrice).toBe(true);
    expect(result.primary).toBe("retailer_unavailable");
    expect(result.cases).not.toContain("budget_excludes");
  });

  it("treats exactly 30 as out of an under-30 budget", () => {
    const budget = extractBudgetConstraint("sub 30 de lei");
    expect(budget.exclusiveMax).toBe(true);
    expect(priceSatisfiesBudget(30, budget)).toBe(false);
    expect(priceSatisfiesBudget(29.99, budget)).toBe(true);
    const result = diagnoseAvailability({
      allWines: [wine(30)],
      budget,
      retailer: detectRetailer("unknown"),
    });
    expect(result.primary).toBe("budget_excludes");
  });

  it("distinguishes budget exclusion from missing retailer data", () => {
    const result = diagnoseAvailability({
      allWines: [wine(45)],
      budget: extractBudgetConstraint("sub 30 de lei"),
      retailer: detectRetailer("unknown"),
    });
    expect(result.cases).toContain("budget_excludes");
    expect(result.cases).not.toContain("retailer_unavailable");
  });

  it("marks stale offers as no verified price", () => {
    const stale = wine(25, {
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: "https://l.profitshare.ro/l/staleoffer",
          wineSlug: "test-wine-0-75l",
          productKey: "test-wine-0-75l",
          bottleSizeMl: 750,
          vintage: null,
          priceRon: 25,
          checkedAt: "2020-01-01T00:00:00.000Z",
          inStock: true,
        },
      ],
    });
    const result = diagnoseAvailability({
      allWines: [stale],
      budget: extractBudgetConstraint("sub 30 de lei"),
      retailer: detectRetailer("Mega"),
    });
    expect(result.primary).toBe("no_verified_price");
  });
});
