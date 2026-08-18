import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  classifyOccasionSanity,
  distributionStats,
  giftDisplayState,
  hardBudgetCompliant,
  removePairingProducerEvidence,
  spearmanCorrelation,
} from "@/lib/product-release-gate";
import { assessRecommendationEligibility } from "@/lib/recommendation/eligibility";
import { scoreWineForDish } from "@/lib/recommendation/dish-match";
import {
  rankWinesForOccasion,
  winePassesHardConstraints,
} from "@/lib/recommendation/occasion-match";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import {
  publicFoodScoreDisplay,
  publicGiftScoreDisplay,
} from "@/lib/scoring-v2/public-secondary-display";
import {
  getSecondaryScoringMode,
  setSecondaryScoringModeForTests,
} from "@/lib/scoring-v2/secondary-scoring-mode";

afterEach(() => setSecondaryScoringModeForTests(null));

function wine(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "fixture",
    name: "Fixture",
    type: "red",
    sweetness: "sec",
    vintage: 2022,
    priceAvg: 50,
    valueScore: 75,
    giftScore: 61,
    foodMatchScore: 64,
    grapeVarieties: [{ name: "Fetească Neagră" }],
    winery: { name: "Crama Test", slug: "crama-test" },
    region: { name: "Dealu Mare" },
    foodPairings: [],
    producerContent: null,
    ...overrides,
  };
}

describe("Prompt 19 read-only release gate", () => {
  it("keeps public production in shadow and therefore on stored secondary scores", () => {
    setSecondaryScoringModeForTests("shadow");
    const fixture = wine();
    expect(getSecondaryScoringMode()).toBe("shadow");
    expect(publicGiftScoreDisplay(fixture).score).toBe(61);
    expect(publicFoodScoreDisplay(fixture).score).toBe(64);
  });

  it("implements the intended Gift confidence display thresholds", () => {
    expect(giftDisplayState(39)).toBe("HIDDEN");
    expect(giftDisplayState(40)).toBe("LIMITED");
    expect(giftDisplayState(54)).toBe("LIMITED");
    expect(giftDisplayState(55)).toBe("NORMAL");
  });

  it("does not display style-only Food precision in live simulation", () => {
    setSecondaryScoringModeForTests("live");
    const display = publicFoodScoreDisplay(wine({ foodPairings: [], producerContent: null }));
    expect(display.score).toBeNull();
    expect(display.provisional).toBe(true);
  });

  it("keeps exact dish match separate from global versatility", () => {
    const narrow = wine({
      foodPairings: [{ dish: "Sarmale", basis: ["editorial_judgment"] }],
    });
    const dish = scoreWineForDish(narrow, "Sarmale");
    const global = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: narrow.foodPairings,
    });
    expect(dish.score).toBe(90);
    expect(global.score).toBeLessThan(dish.score);
  });

  it("removes only producer provenance in the corrected overlay", () => {
    const current = [{
      dish: "Tocăniță de vânat",
      basis: ["producer_evidence", "verified_style", "editorial_judgment"],
    }];
    const corrected = removePairingProducerEvidence(current, "Tocăniță de vânat");
    expect(corrected[0]?.basis).toEqual(["verified_style", "editorial_judgment"]);
    expect(removePairingProducerEvidence(corrected, "Tocăniță de vânat")).toEqual(corrected);
    expect(current[0]?.basis).toContain("producer_evidence");
  });

  it("never exceeds a hard occasion budget", () => {
    const catalog = [
      wine({ id: 1, slug: "within", priceAvg: 49 }),
      wine({ id: 2, slug: "above", priceAvg: 51 }),
      wine({ id: 3, slug: "unknown", priceAvg: null }),
    ];
    const input = {
      occasion: "cadou" as const,
      budgetMax: 50,
      budgetSpecified: true,
      budgetConstraint: "hard" as const,
    };
    expect(winePassesHardConstraints(catalog[0], input)).toBe(true);
    expect(winePassesHardConstraints(catalog[1], input)).toBe(false);
    expect(winePassesHardConstraints(catalog[2], input)).toBe(false);
    expect(rankWinesForOccasion(catalog, input).map((row) => row.wine.slug)).toEqual(["within"]);
    expect(hardBudgetCompliant(50, 50)).toBe(true);
    expect(hardBudgetCompliant(50.01, 50)).toBe(false);
  });

  it("classifies a dry non-dessert recommendation for dessert as bad", () => {
    expect(
      classifyOccasionSanity({
        occasion: "pentru-desert",
        type: "red",
        sweetness: "sec",
        confidence: 90,
        eligibility: "ELIGIBLE",
        price: 50,
      }),
    ).toBe("BAD");
    expect(scoreWineForDish(wine(), "desert").score).toBeLessThan(50);
  });

  it("prevents conflicting sweetness identity from confident eligibility", () => {
    const conflicting = wine({
      slug: "fixture-dulce",
      sweetness: "sec",
    });
    expect(assessRecommendationEligibility(conflicting)).toBe("REVIEW_REQUIRED");
  });

  it("treats missing vintage as low confidence rather than inventing one", () => {
    expect(assessRecommendationEligibility(wine({ type: "sparkling", vintage: null }))).toBe(
      "ELIGIBLE_LOW_CONFIDENCE",
    );
  });

  it("computes deterministic distributions and tied-rank correlation", () => {
    expect(distributionStats([10, 20, 30, 40]).median).toBe(25);
    expect(spearmanCorrelation([1, 2, 2, 4], [10, 20, 20, 40])).toBe(1);
  });

  it("contains no production mutation path in the consolidated command", async () => {
    const source = await readFile("scripts/product-release-gate.ts", "utf8");
    expect(source).not.toMatch(/\bdb\.(update|insert|delete)\b/);
    expect(source).not.toMatch(/SECONDARY_SCORING_MODE\s*=\s*["']live/);
    expect(source).toContain('if (productionMode !== "shadow")');
    expect(source).toContain('mode !== "shadow" && mode !== "display"');
    expect(source).toContain('process.argv.includes("--apply")');
  });
});
