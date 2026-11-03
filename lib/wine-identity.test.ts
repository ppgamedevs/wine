import { describe, expect, it } from "vitest";
import {
  buildCanonicalWineIdentityKey,
  wineIdentitiesMatch,
  wineIdentityConflicts,
  type CanonicalWineIdentity,
} from "@/lib/wine-identity";

const base: CanonicalWineIdentity = {
  producer: "Murfatlar",
  range: "Zestrea",
  productName: "Muscat Ottonel",
  grapeVarieties: ["Muscat Ottonel"],
  color: "alb",
  sweetness: "demisec",
  bottleSizeMl: 750,
  vintage: null,
  sourceProductId: "zestrea-muscat-ottonel-alb-demisec-750ml",
};

describe("canonical wine identity", () => {
  it("is deterministic and order-insensitive for grapes", () => {
    const left = { ...base, grapeVarieties: ["Merlot", "Cabernet Sauvignon"] };
    const right = { ...base, grapeVarieties: ["Cabernet Sauvignon", "Merlot"] };
    expect(buildCanonicalWineIdentityKey(left)).toBe(
      buildCanonicalWineIdentityKey(right),
    );
  });

  it("treats sweetness mismatch as a conflict", () => {
    expect(
      wineIdentityConflicts(base, { ...base, sweetness: "demidulce" }),
    ).toContain("SWEETNESS");
    expect(wineIdentitiesMatch(base, { ...base, sweetness: "demidulce" })).toBe(
      false,
    );
  });

  it("treats grape mismatch as a conflict", () => {
    expect(
      wineIdentityConflicts(base, {
        ...base,
        productName: "Chardonnay",
        grapeVarieties: ["Chardonnay"],
      }),
    ).toEqual(expect.arrayContaining(["PRODUCT_NAME", "GRAPES"]));
  });

  it("treats bottle size and vintage mismatches as conflicts", () => {
    expect(
      wineIdentityConflicts(base, { ...base, bottleSizeMl: 1500 }),
    ).toContain("BOTTLE_SIZE");
    const vintageKnown = { ...base, vintage: 2024 };
    expect(
      wineIdentityConflicts(vintageKnown, { ...vintageKnown, vintage: 2025 }),
    ).toContain("VINTAGE");
  });

  it("does not invent a conflict when one side is unknown", () => {
    expect(
      wineIdentityConflicts(base, {
        ...base,
        sweetness: null,
        bottleSizeMl: null,
        vintage: null,
        sourceProductId: null,
      }),
    ).toEqual([]);
  });
});
