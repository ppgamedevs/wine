import { describe, expect, it } from "vitest";
import {
  PREMIAT_VARIANTS_750ML,
  premiatIdentityKey,
  premiatSourceUrl,
} from "@/lib/murfatlar-premiat-profile";

describe("Premiat 750ml source profile", () => {
  it("keeps three distinct 750ml variants and no 1.5L variant", () => {
    expect(PREMIAT_VARIANTS_750ML).toHaveLength(3);
    expect(PREMIAT_VARIANTS_750ML.map((variant) => variant.key)).toEqual([
      "rosu",
      "alb",
      "roze",
    ]);
    expect(
      PREMIAT_VARIANTS_750ML.every((variant) => variant.bottleSizeMl === 750),
    ).toBe(true);
    expect(
      new Set(PREMIAT_VARIANTS_750ML.map((variant) => variant.name)).size,
    ).toBe(3);
  });

  it("uses unique official variant query identities, not synthetic anchors", () => {
    const urls = PREMIAT_VARIANTS_750ML.map((variant) =>
      premiatSourceUrl(variant),
    );
    expect(new Set(urls).size).toBe(3);
    expect(urls.every((url) => url.includes("?variant="))).toBe(true);
    expect(urls.every((url) => !url.includes("#"))).toBe(true);
    expect(
      new Set(
        PREMIAT_VARIANTS_750ML.map((variant) => premiatIdentityKey(variant)),
      ).size,
    ).toBe(3);
  });

  it("keeps source text free of mojibake and invented technical facts", () => {
    const serialized = JSON.stringify(PREMIAT_VARIANTS_750ML);
    expect(serialized).not.toMatch(/[ÃÂÈ]/);
    for (const variant of PREMIAT_VARIANTS_750ML) {
      expect(variant.name).not.toMatch(/[\u00c3\u00c2\u00c8]/);
      expect(variant.culinaryPairings.length).toBeGreaterThan(20);
      expect(variant.tastingNotes.length).toBeGreaterThan(40);
      expect(variant).not.toHaveProperty("alcohol");
      expect(variant).not.toHaveProperty("grapeVarieties");
      expect(variant).not.toHaveProperty("vintage");
    }
  });
});
