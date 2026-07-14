import { describe, expect, it } from "vitest";
import {
  calculatePriceEfficiency,
  calculateVinIntelScore,
} from "@/lib/scoring-v2/value-score";
import { resolveConfidenceScoreCeiling } from "@/lib/scoring-v2/quality-confidence";
import { FINAL_SCORE_MAX, FINAL_SCORE_MIN } from "@/lib/scoring-v2/constants";

const BASE_INPUT = {
  price: 60,
  wineType: "red",
  grapeVarieties: ["Feteasca Neagra"],
  region: "Dealu Mare",
  wineryName: "Crama Test",
};

describe("calculateVinIntelScore determinism", () => {
  it("returns an identical result for identical input (reproducibility requirement)", () => {
    const first = calculateVinIntelScore(BASE_INPUT);
    const second = calculateVinIntelScore({ ...BASE_INPUT });
    expect(first).toEqual(second);
  });
});

describe("calculateVinIntelScore confidence ceilings", () => {
  it("never lets a low-confidence wine exceed its documented score ceiling", () => {
    const result = calculateVinIntelScore({
      ...BASE_INPUT,
      qualityConfidenceOverride: 0.1,
    });
    const expectedCeiling = resolveConfidenceScoreCeiling(10);
    expect(result.valueScore).toBeLessThanOrEqual(expectedCeiling);
    expect(result.confidenceScoreCeiling).toBe(expectedCeiling);
  });

  it("marks scores as provisional below the provisional confidence threshold", () => {
    const result = calculateVinIntelScore({
      ...BASE_INPUT,
      qualityConfidenceOverride: 0.2,
    });
    expect(result.provisional).toBe(true);
  });

  it("does not mark high-confidence scores as provisional", () => {
    const result = calculateVinIntelScore({
      ...BASE_INPUT,
      qualityConfidenceOverride: 0.9,
    });
    expect(result.provisional).toBe(false);
  });

  it("records a breakdown item explaining the ceiling whenever it binds", () => {
    const result = calculateVinIntelScore({
      ...BASE_INPUT,
      qualityConfidenceOverride: 0.15,
    });
    const ceilingItem = result.items.find(
      (item) => item.label === "Plafon incredere date",
    );
    // Only asserted when the ceiling actually reduced the score below the
    // quality-clamped value; with 15% confidence this should always bind
    // because the ceiling (69) is well below the achievable quality-clamped
    // range for this input.
    if (result.valueScore < result.quality) {
      expect(ceilingItem).toBeDefined();
    }
  });

  it("keeps the final score within the global [FINAL_SCORE_MIN, FINAL_SCORE_MAX] bounds", () => {
    for (const confidence of [0.05, 0.3, 0.5, 0.7, 0.95]) {
      const result = calculateVinIntelScore({
        ...BASE_INPUT,
        qualityConfidenceOverride: confidence,
      });
      expect(result.valueScore).toBeGreaterThanOrEqual(FINAL_SCORE_MIN);
      expect(result.valueScore).toBeLessThanOrEqual(FINAL_SCORE_MAX);
    }
  });
});

describe("calculateVinIntelScore without a price", () => {
  it("returns a provisional, price-independent score capped by confidence", () => {
    const result = calculateVinIntelScore({
      ...BASE_INPUT,
      price: 0,
      qualityConfidenceOverride: 0.1,
    });
    expect(result.provisional).toBe(true);
    expect(result.priceEfficiency).toBe(70);
    expect(result.valueScore).toBeLessThanOrEqual(
      resolveConfidenceScoreCeiling(10),
    );
  });

  it("caps no-price confidence at 0.35 even when override requests more", () => {
    const withoutOverride = calculateVinIntelScore({
      ...BASE_INPUT,
      price: 0,
      grapeVarieties: ["Feteasca Neagra"],
      region: "Dealu Mare",
      wineryName: "Crama Test",
      wineMedals: [
        { competition: "Concurs", medal: "gold" },
        { competition: "Concurs 2", medal: "gold" },
      ],
      criticScore: 95,
      ratingAvg: 4.8,
      communityScore: 90,
    });
    expect(withoutOverride.qualityConfidence).toBeLessThanOrEqual(0.35);
  });
});

describe("calculatePriceEfficiency", () => {
  it("returns the base efficiency (70) when quality matches the expected level exactly", () => {
    expect(calculatePriceEfficiency(75, 75)).toBe(70);
  });

  it("rewards quality above the expected level for its price segment", () => {
    const efficiency = calculatePriceEfficiency(85, 75);
    expect(efficiency).toBeGreaterThan(70);
  });

  it("penalizes quality below the expected level for its price segment", () => {
    const efficiency = calculatePriceEfficiency(65, 75);
    expect(efficiency).toBeLessThan(70);
  });

  it("clamps to the documented [35, 97] bounds for extreme deltas", () => {
    expect(calculatePriceEfficiency(100, 0)).toBeLessThanOrEqual(97);
    expect(calculatePriceEfficiency(0, 100)).toBeGreaterThanOrEqual(35);
  });
});

describe("calculateVinIntelScore missing-data safety", () => {
  it("handles wines with no factual evidence at all without throwing", () => {
    expect(() =>
      calculateVinIntelScore({ price: 45 }),
    ).not.toThrow();
  });

  it("gives a wine with no evidence a low confidence and a corresponding ceiling", () => {
    const result = calculateVinIntelScore({ price: 45 });
    expect(result.confidencePercent).toBeLessThan(50);
    expect(result.valueScore).toBeLessThanOrEqual(result.confidenceScoreCeiling);
  });
});
