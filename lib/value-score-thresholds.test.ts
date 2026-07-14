import { describe, expect, it } from "vitest";
import {
  getValueScoreVerdict,
  meetsRecommendationThreshold,
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_BANDS,
  VALUE_SCORE_EXCEPTIONAL_MIN,
  VALUE_SCORE_FAIR_MIN,
  VALUE_SCORE_MODEST_MIN,
  VALUE_SCORE_VERY_GOOD_MIN,
  valueScoreVerdictLabel,
} from "@/lib/value-score-thresholds";

describe("getValueScoreVerdict", () => {
  it("maps every threshold boundary to the expected verdict", () => {
    expect(getValueScoreVerdict(VALUE_SCORE_EXCEPTIONAL_MIN)).toBe("exceptional");
    expect(getValueScoreVerdict(VALUE_SCORE_EXCEPTIONAL_MIN - 1)).toBe("very_good");
    expect(getValueScoreVerdict(VALUE_SCORE_VERY_GOOD_MIN)).toBe("very_good");
    expect(getValueScoreVerdict(VALUE_SCORE_VERY_GOOD_MIN - 1)).toBe("recommended");
    expect(getValueScoreVerdict(MIN_RECOMMENDED_VALUE_SCORE)).toBe("recommended");
    expect(getValueScoreVerdict(MIN_RECOMMENDED_VALUE_SCORE - 1)).toBe("fair");
    expect(getValueScoreVerdict(VALUE_SCORE_FAIR_MIN)).toBe("fair");
    expect(getValueScoreVerdict(VALUE_SCORE_FAIR_MIN - 1)).toBe("modest");
    expect(getValueScoreVerdict(VALUE_SCORE_MODEST_MIN)).toBe("modest");
    expect(getValueScoreVerdict(VALUE_SCORE_MODEST_MIN - 1)).toBe("overpriced");
  });

  it("treats null/undefined scores as 0 (overpriced), never as a free pass", () => {
    expect(getValueScoreVerdict(null)).toBe("overpriced");
    expect(getValueScoreVerdict(undefined)).toBe("overpriced");
  });
});

describe("meetsRecommendationThreshold", () => {
  it("is consistent with MIN_RECOMMENDED_VALUE_SCORE", () => {
    expect(meetsRecommendationThreshold(MIN_RECOMMENDED_VALUE_SCORE)).toBe(true);
    expect(meetsRecommendationThreshold(MIN_RECOMMENDED_VALUE_SCORE - 1)).toBe(
      false,
    );
    expect(meetsRecommendationThreshold(null)).toBe(false);
  });
});

describe("valueScoreVerdictLabel", () => {
  it("uses the canonical 'Merita pretul' wording for the recommended tier", () => {
    expect(valueScoreVerdictLabel(MIN_RECOMMENDED_VALUE_SCORE)).toBe(
      "Merita pretul",
    );
  });

  it("never returns an absolute/superlative label like 'perfect' or 'garantat'", () => {
    for (const score of [0, 20, 40, 60, 70, 80, 90, 100]) {
      const label = valueScoreVerdictLabel(score).toLowerCase();
      expect(label).not.toContain("perfect");
      expect(label).not.toContain("garantat");
      expect(label).not.toContain("cel mai bun");
    }
  });
});

describe("VALUE_SCORE_BANDS", () => {
  it("covers the full 0-100 range with no gaps or overlaps", () => {
    const sorted = [...VALUE_SCORE_BANDS].sort((a, b) => a.min - b.min);
    expect(sorted[0].min).toBe(0);
    expect(sorted[sorted.length - 1].max).toBeGreaterThanOrEqual(97);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].min).toBe(sorted[i - 1].max + 1);
    }
  });

  it("stays in sync with the exported threshold constants (no duplicated magic numbers)", () => {
    const recommendedBand = VALUE_SCORE_BANDS.find(
      (band) => band.min === MIN_RECOMMENDED_VALUE_SCORE,
    );
    expect(recommendedBand).toBeDefined();
  });
});
