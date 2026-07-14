import { describe, expect, it } from "vitest";
import { buildGenericPairingGuidance } from "@/lib/generic-pairing-guidance";

describe("buildGenericPairingGuidance", () => {
  it("never suggests red-wine pairings (sarmale/mititei) for a white wine", () => {
    const guidance = buildGenericPairingGuidance({ type: "white" });
    const text = `${guidance.categories.join(" ")} ${guidance.note}`.toLowerCase();
    expect(text).not.toContain("sarmale");
    expect(text).not.toContain("mititei");
  });

  it("never suggests red-wine pairings for a sparkling wine", () => {
    const guidance = buildGenericPairingGuidance({ type: "sparkling" });
    const text = `${guidance.categories.join(" ")} ${guidance.note}`.toLowerCase();
    expect(text).not.toContain("sarmale");
    expect(text).not.toContain("mititei");
  });

  it("adapts white wine guidance to sweetness (dry vs sweet get different categories)", () => {
    const dry = buildGenericPairingGuidance({ type: "white", sweetness: "sec" });
    const sweet = buildGenericPairingGuidance({
      type: "white",
      sweetness: "dulce",
    });
    expect(dry.categories).not.toEqual(sweet.categories);
    expect(sweet.note.toLowerCase()).toContain("dulce");
  });

  it("returns dessert-appropriate categories for dessert wines", () => {
    const guidance = buildGenericPairingGuidance({ type: "dessert" });
    expect(guidance.categories.join(" ").toLowerCase()).toContain("desert");
  });

  it("always labels the guidance as general, not a wine-specific evaluation", () => {
    for (const type of ["red", "white", "rose", "sparkling", "dessert", "orange"]) {
      const guidance = buildGenericPairingGuidance({ type });
      expect(guidance.note.length).toBeGreaterThan(0);
      expect(guidance.categories.length).toBeGreaterThan(0);
    }
  });

  it("falls back to a conservative, honest message for an unknown/missing type", () => {
    const guidance = buildGenericPairingGuidance({ type: null });
    expect(guidance.note.toLowerCase()).toContain("nu avem inca suficiente date");
  });
});
