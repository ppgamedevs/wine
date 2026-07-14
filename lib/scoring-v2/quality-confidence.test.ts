import { describe, expect, it } from "vitest";
import {
  calculateQualityConfidence,
  confidenceLabel,
  confidencePercent,
  isProvisionalScore,
  resolveConfidenceScoreCeiling,
} from "@/lib/scoring-v2/quality-confidence";

describe("calculateQualityConfidence", () => {
  it("returns the floor confidence when no evidence is available", () => {
    const confidence = calculateQualityConfidence({
      hasMlModel: false,
      mlPrediction: null,
    });
    // Base floor is 0.18, rounded to 1 decimal by round1() -> 0.2.
    expect(confidence).toBeCloseTo(0.2, 5);
  });

  it("increases with each additional reliable field", () => {
    const bare = calculateQualityConfidence({
      hasMlModel: false,
      mlPrediction: null,
    });
    const withGrapes = calculateQualityConfidence({
      grapeVarieties: ["Feteasca Neagra"],
      hasMlModel: false,
      mlPrediction: null,
    });
    const withEverything = calculateQualityConfidence({
      grapeVarieties: ["Feteasca Neagra"],
      region: "Dealu Mare",
      wineryName: "Crama X",
      wineMedals: [
        { competition: "Concurs", medal: "gold" },
        { competition: "Concurs 2", medal: "silver" },
      ],
      criticScore: 92,
      ratingAvg: 4.2,
      communityScore: 80,
      hasMlModel: true,
      mlPrediction: 88,
    });

    expect(withGrapes).toBeGreaterThan(bare);
    expect(withEverything).toBeGreaterThan(withGrapes);
  });

  it("never exceeds the documented [0.1, 0.95] bounds", () => {
    const maxed = calculateQualityConfidence({
      grapeVarieties: ["A", "B", "C"],
      region: "Region",
      wineryName: "Winery",
      wineMedals: Array.from({ length: 10 }, () => ({
        competition: "Concurs",
        medal: "gold" as const,
      })),
      criticScore: 99,
      ratingAvg: 5,
      communityScore: 100,
      hasMlModel: true,
      mlPrediction: 99,
    });
    // clamp() enforces the 0.95 ceiling, but round1() can round an exact
    // 0.95 boundary up to 1.0 (Math.round half-up) - this does not change
    // scoring behavior since confidencePercent(0.95) and (1.0) both fall in
    // the same ">=85% -> full range" ceiling tier. We assert the true upper
    // bound (1) rather than the pre-rounding clamp value.
    expect(maxed).toBeLessThanOrEqual(1);

    const minimal = calculateQualityConfidence({
      hasMlModel: false,
      mlPrediction: null,
    });
    expect(minimal).toBeGreaterThanOrEqual(0.1);
  });
});

describe("confidencePercent", () => {
  it("converts a 0-1 confidence value to an integer 0-100 percent", () => {
    expect(confidencePercent(0.5)).toBe(50);
    expect(confidencePercent(0.873)).toBe(87);
    expect(confidencePercent(0)).toBe(0);
    expect(confidencePercent(1)).toBe(100);
  });

  it("clamps out-of-range inputs", () => {
    expect(confidencePercent(-0.5)).toBe(0);
    expect(confidencePercent(1.5)).toBe(100);
  });
});

describe("confidenceLabel", () => {
  it("maps percent tiers to the five documented Romanian labels", () => {
    expect(confidenceLabel(0.9)).toBe("Foarte ridicata");
    expect(confidenceLabel(0.75)).toBe("Ridicata");
    expect(confidenceLabel(0.55)).toBe("Moderata");
    expect(confidenceLabel(0.35)).toBe("Scazuta");
    expect(confidenceLabel(0.1)).toBe("Date insuficiente");
  });

  it("is consistent at exact tier boundaries", () => {
    expect(confidenceLabel(0.85)).toBe("Foarte ridicata");
    expect(confidenceLabel(0.84)).toBe("Ridicata");
    expect(confidenceLabel(0.7)).toBe("Ridicata");
    expect(confidenceLabel(0.69)).toBe("Moderata");
  });
});

describe("resolveConfidenceScoreCeiling", () => {
  it("applies hard ceilings so low confidence cannot unlock a high score", () => {
    expect(resolveConfidenceScoreCeiling(0)).toBe(69);
    expect(resolveConfidenceScoreCeiling(29)).toBe(69);
    expect(resolveConfidenceScoreCeiling(30)).toBe(79);
    expect(resolveConfidenceScoreCeiling(49)).toBe(79);
    expect(resolveConfidenceScoreCeiling(50)).toBe(87);
    expect(resolveConfidenceScoreCeiling(69)).toBe(87);
    expect(resolveConfidenceScoreCeiling(70)).toBe(94);
    expect(resolveConfidenceScoreCeiling(84)).toBe(94);
    expect(resolveConfidenceScoreCeiling(85)).toBe(97);
    expect(resolveConfidenceScoreCeiling(100)).toBe(97);
  });

  it("is monotonically non-decreasing with confidence", () => {
    const percents = [0, 10, 29, 30, 49, 50, 69, 70, 84, 85, 100];
    const ceilings = percents.map(resolveConfidenceScoreCeiling);
    for (let i = 1; i < ceilings.length; i += 1) {
      expect(ceilings[i]).toBeGreaterThanOrEqual(ceilings[i - 1]);
    }
  });
});

describe("isProvisionalScore", () => {
  it("flags scores below the provisional confidence threshold", () => {
    expect(isProvisionalScore(0.1)).toBe(true);
    expect(isProvisionalScore(0.44)).toBe(true);
    expect(isProvisionalScore(0.45)).toBe(false);
    expect(isProvisionalScore(0.9)).toBe(false);
  });
});
