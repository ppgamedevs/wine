import { describe, expect, it } from "vitest";
import {
  BABANU_VARIANTS,
  babanuIdentityKey,
  babanuSourceUrl,
} from "@/lib/murfatlar-babanu-profile";

describe("Babanu 2L source profile", () => {
  it("keeps the five visible variants separate", () => {
    expect(BABANU_VARIANTS).toHaveLength(5);
    expect(new Set(BABANU_VARIANTS.map((variant) => variant.key)).size).toBe(5);
    expect(BABANU_VARIANTS.map((variant) => variant.name)).toEqual([
      "Babanu Roșu Demidulce, 2L",
      "Babanu Roșu Demisec, 2L",
      "Babanu Alb Demidulce, 2L",
      "Babanu Alb Demisec, 2L",
      "Babanu Roze Demidulce, 2L",
    ]);
    expect(BABANU_VARIANTS.every((variant) => variant.name.includes("2L"))).toBe(
      true,
    );
  });

  it("uses official query identities and no synthetic anchors", () => {
    for (const variant of BABANU_VARIANTS) {
      const url = babanuSourceUrl(variant);
      expect(url.startsWith("https://murfatlar-vinul.ro/babanu/?variant=")).toBe(
        true,
      );
      expect(url).not.toContain("#");
      expect(babanuIdentityKey(variant)).toContain("2000ml");
      expect(babanuIdentityKey(variant)).toContain("nv");
    }
  });

  it("does not invent technical facts", () => {
    for (const variant of BABANU_VARIANTS) {
      expect(variant).not.toHaveProperty("alcohol");
      expect(variant).not.toHaveProperty("vintage");
      expect(variant).not.toHaveProperty("grapeVarieties");
      expect(variant.name).not.toMatch(/750|0\.75/i);
    }
  });

  it("preserves clean Romanian text and the producer's rose pairings", () => {
    const rose = BABANU_VARIANTS.find((variant) => variant.key === "roze-demidulce");
    expect(rose?.tastingNotes).toContain("roz intens");
    expect(rose?.foodNotes.map((note) => note.dish)).toEqual([
      "Carne albă",
      "Pește de apă dulce",
      "Preparate de legume",
      "Brânză",
      "Carne de porc",
    ]);
    expect(JSON.stringify(BABANU_VARIANTS)).not.toMatch(/Ã|È|Ä/);
  });
});
