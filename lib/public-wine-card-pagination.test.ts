import { describe, expect, it } from "vitest";
import {
  buildPublicWineCardViewModel,
  buildPublicWineryDirectoryItem,
} from "@/lib/public-wine-card";
import {
  MAX_PUBLIC_CATALOG_PAGE,
  MAX_PUBLIC_CATALOG_QUERY_LENGTH,
  WINE_CATALOG_PAGE_SIZE,
  WINERY_DIRECTORY_PAGE_SIZE,
  parsePublicWineCatalogRequest,
  parsePublicWineryDirectoryRequest,
} from "@/lib/public-wine-card-types";
import type { WineryListItem, WineWithRelations } from "@/types";

describe("bounded public catalog requests", () => {
  it("uses fixed page sizes and caps untrusted pages", () => {
    const wineRequest = parsePublicWineCatalogRequest({
      page: "999999999",
      pageSize: "5000",
    });
    const wineryRequest = parsePublicWineryDirectoryRequest({
      page: "-4",
      pageSize: "5000",
    });

    expect(WINE_CATALOG_PAGE_SIZE).toBe(24);
    expect(WINERY_DIRECTORY_PAGE_SIZE).toBe(18);
    expect(wineRequest.page).toBe(MAX_PUBLIC_CATALOG_PAGE);
    expect(wineryRequest.page).toBe(1);
    expect(wineRequest).not.toHaveProperty("pageSize");
    expect(wineryRequest).not.toHaveProperty("pageSize");
  });

  it("validates filters and bounds search text", () => {
    const request = parsePublicWineCatalogRequest({
      q: `  ${"x".repeat(200)}  `,
      type: "invalid",
      sweetness: ["sec", "dulce"],
      sort: "gift-desc",
      price: "all",
      score: "exceptional",
    });

    expect(request.filters.query).toHaveLength(
      MAX_PUBLIC_CATALOG_QUERY_LENGTH,
    );
    expect(request.filters.type).toBe("all");
    expect(request.filters.sweetness).toBe("all");
    expect(request.filters.sort).toBe("value-desc");
    expect(request.filters.priceBand).toBe("all");
    expect(request.filters.verdict).toBe("exceptional");
  });
});

describe("public catalog payload DTOs", () => {
  it("omits numeric IDs and non-card wine fields", () => {
    const wine = {
      id: 42,
      slug: "bounded-wine",
      name: "Bounded Wine",
      type: "red",
      sweetness: "sec",
      vintage: 2022,
      status: "verified",
      valueScore: 82,
      currentPrice: 55,
      priceAvg: 58,
      priceHistory: [],
      affiliateLinks: [],
      availability: [],
      grapeVarieties: [],
      imageUrl: null,
      imageSource: null,
      imageAlt: null,
      sourceUrl: null,
      producerContent: {
        sourceUrl: "https://private.example/source",
      },
      winery: {
        id: 7,
        slug: "bounded-winery",
        name: "Bounded Winery",
        verified: true,
      },
      region: { id: 9, slug: "dealul-mare", name: "Dealul Mare" },
    } as unknown as WineWithRelations;

    const serialized = JSON.stringify(buildPublicWineCardViewModel(wine));
    expect(serialized).not.toMatch(/"id":|sourceUrl|wineryId|regionId/);
    expect(serialized).not.toContain("private.example");
    expect(serialized).toContain('"slug":"bounded-wine"');
  });

  it("maps wineries to a slug-keyed allowlist", () => {
    const winery = {
      id: 17,
      slug: "safe-winery",
      name: "Safe Winery",
      description: "Public description",
      logoUrl: null,
      verified: true,
      stripeCustomerId: "secret_customer",
      region: { id: 3, slug: "banat", name: "Banat" },
      wineCount: 2,
      avgValueScore: 81,
      priceRange: { min: 40, max: 80 },
      bestWine: {
        slug: "best-wine",
        name: "Best Wine",
        valueScore: 84,
        priceAvg: 60,
      },
      bestUnder50: null,
      bestUnder100: null,
      topGrapes: ["Feteasca Neagra"],
      lastPriceCheck: "2026-08-20T08:00:00.000Z",
    } as unknown as WineryListItem;

    const serialized = JSON.stringify(buildPublicWineryDirectoryItem(winery));
    expect(serialized).not.toMatch(/"id":|stripeCustomerId|regionId/);
    expect(serialized).not.toContain("secret_customer");
    expect(serialized).toContain('"slug":"safe-winery"');
  });
});
