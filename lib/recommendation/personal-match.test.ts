import { describe, expect, it } from "vitest";
import {
  compareWithCanonicalMatch,
  computePersonalMatch,
  type PersonalMatchWine,
} from "@/lib/recommendation/personal-match";

const WINE: PersonalMatchWine = {
  slug: "selene-feteasca-neagra-2024",
  type: "red",
  sweetness: "sec",
  acidity: 6.2,
  foodPairings: [{ dish: "Sarmale", note: "Pairing oficial." }],
  producerContent: null,
  sweetnessTrust: "verified",
};

describe("computePersonalMatch", () => {
  it("returns null instead of a neutral 50 when nothing is known", () => {
    const result = computePersonalMatch(WINE, {});
    expect(result.compatibility).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.unknowns).toEqual([]);
  });

  it("scores a matching colour highly", () => {
    const match = computePersonalMatch(WINE, { color: "red" });
    const mismatch = computePersonalMatch(WINE, { color: "white" });
    expect(match.compatibility).toBe(100);
    expect(mismatch.compatibility).toBe(20);
  });

  it("scores sweetness only when it is stored", () => {
    expect(computePersonalMatch(WINE, { sweetness: "sec" }).compatibility).toBe(100);
    expect(computePersonalMatch(WINE, { sweetness: "dulce" }).compatibility).toBe(30);

    const unknown = computePersonalMatch(
      { ...WINE, sweetness: null },
      { sweetness: "sec" },
    );
    expect(unknown.compatibility).toBeNull();
    expect(unknown.unknowns).toContain("sweetness_not_stored");
    expect(unknown.components.find((part) => part.key === "sweetness")).toBeUndefined();
  });

  it("discloses a missing body instead of inventing one", () => {
    const result = computePersonalMatch(WINE, { body: "full" });
    expect(result.compatibility).toBeNull();
    expect(result.unknowns).toContain("body_not_stored");
    expect(result.reasons.join(" ")).toContain("body_not_stored");
  });

  it("never maps alcohol to body", () => {
    const result = computePersonalMatch(
      { ...WINE, alcohol: 14.5 },
      { body: "full" },
    );
    expect(result.compatibility).toBeNull();
    expect(result.unknowns).toContain("body_not_stored");
  });

  it("uses stored acidity with an explicit band", () => {
    const low = computePersonalMatch(WINE, { acidity: "low" });
    expect(low.components[0]?.detail).toContain("6.2 g/L");
    expect(low.compatibility).not.toBeNull();

    const missing = computePersonalMatch({ ...WINE, acidity: null }, { acidity: "low" });
    expect(missing.compatibility).toBeNull();
    expect(missing.unknowns).toContain("acidity_not_stored");
  });

  it("scores a dish through the existing pairing engine", () => {
    const result = computePersonalMatch(WINE, { dish: "sarmale" });
    expect(result.compatibility).not.toBeNull();
    expect(result.components.some((part) => part.key === "food")).toBe(true);
  });

  it("treats an excluded colour as a hard incompatibility", () => {
    const result = computePersonalMatch(WINE, {
      color: "red",
      excludedColors: ["red"],
    });
    expect(result.components.find((part) => part.key === "color")?.score).toBe(0);
  });

  it("does not mutate the wine or its canonical scores", () => {
    const wine = { ...WINE, valueScore: 79 } as PersonalMatchWine & {
      valueScore: number;
    };
    const before = JSON.stringify(wine);
    computePersonalMatch(wine, { color: "red", dish: "sarmale" });
    expect(JSON.stringify(wine)).toBe(before);
    expect(wine.valueScore).toBe(79);
  });

  it("reports the delta against the canonical match in a comparable range", () => {
    const personal = computePersonalMatch(WINE, { color: "red" });
    const delta = compareWithCanonicalMatch(personal, 75);
    expect(delta.delta).toBe(25);
    expect(delta.direction).toBe("up");
    const unknown = compareWithCanonicalMatch(
      computePersonalMatch(WINE, {}),
      75,
    );
    expect(unknown.direction).toBe("unknown");
  });
});
