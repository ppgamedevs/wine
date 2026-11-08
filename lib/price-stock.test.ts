import { describe, expect, it } from "vitest";
import { parseProductStockAvailability } from "@/lib/price-stock";

describe("merchant product stock", () => {
  it("ignores generic availability words in the HTML body", () => {
    expect(parseProductStockAvailability("<p>Alte produse indisponibile</p>")).toBeNull();
  });
  it("uses explicit availability metadata", () => {
    expect(parseProductStockAvailability('<meta property="product:availability" content="InStock">')).toBe(true);
    expect(parseProductStockAvailability('<meta property="product:availability" content="OutOfStock">')).toBe(false);
  });
  it("uses main product Offer in JSON-LD", () => {
    const data = JSON.stringify({
      "@type": "Product", offers: { availability: "https://schema.org/InStock" },
    });
    expect(parseProductStockAvailability('<script type="application/ld+json">' + data + '</script>')).toBe(true);
  });
});
