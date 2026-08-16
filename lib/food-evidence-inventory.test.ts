import { describe, expect, it } from "vitest";
import { inventoryWineCulinarySources } from "@/lib/food-evidence-inventory";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: 1,
    name: slug,
    slug,
    type: "red",
    sweetness: "sec",
    status: "verified",
    foodPairings: [],
    producerContent: null,
    producerPageUrl: null,
    tastingSheetUrl: null,
    sourceUrl: null,
    tastingNotes: null,
    winery: { name: "Budureasca", slug: "budureasca" },
    ...rest,
  } as WineWithRelations;
}

describe("culinary source inventory", () => {
  it("classifies exact producer pages and tasting-sheet PDFs", () => {
    const row = inventoryWineCulinarySources(
      wine({
        slug: "budureasca-origini",
        producerPageUrl: "https://budureasca.ro/vinuri/origini-feteasca-neagra",
        tastingSheetUrl: "https://budureasca.ro/fise/origini.pdf",
      }),
    );
    expect(row.kinds).toEqual(
      expect.arrayContaining(["exact_producer_page", "tasting_sheet", "technical_pdf"]),
    );
    expect(row.noSource).toBe(false);
    expect(row.retailerOnly).toBe(false);
  });

  it("marks retailer-only wines without official URLs", () => {
    const row = inventoryWineCulinarySources(
      wine({
        slug: "retail-only",
        sourceUrl: "https://www.emag.ro/vin-x",
      }),
    );
    expect(row.retailerOnly).toBe(true);
    expect(row.kinds).toContain("retailer_only");
  });
});
