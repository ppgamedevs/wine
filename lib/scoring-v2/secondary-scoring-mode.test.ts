import { afterEach, describe, expect, it } from "vitest";
import { recommendWines, recommendWinesLive } from "@/lib/sommelier";
import {
  resolveTopList,
  topListRankScore,
} from "@/lib/top-lists";
import {
  publicFoodScoreDisplay,
  publicGiftScoreDisplay,
} from "@/lib/scoring-v2/public-secondary-display";
import {
  parseSecondaryScoringMode,
  setSecondaryScoringModeForTests,
} from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";

function catalogWine(
  overrides: Partial<WineWithRelations> & { slug: string; id: number },
): WineWithRelations {
  return {
    name: overrides.name ?? overrides.slug,
    type: "red",
    sweetness: "sec",
    priceAvg: 45,
    valueScore: 70,
    giftScore: 64,
    foodMatchScore: 80,
    grapeVarieties: [{ name: "Merlot" }],
    foodPairings: [],
    foodPairingNotes: [],
    dessertPairings: [],
    medals: [],
    recommendedOccasions: [],
    thingsYouShouldKnow: [],
    availability: [],
    affiliateLinks: [],
    priceHistory: [],
    winery: { id: 1, name: "Crama Test", slug: "crama-test" },
    region: { id: 1, name: "Dealu Mare", slug: "dealu-mare" },
    ...overrides,
  } as WineWithRelations;
}

const sommelierInput = {
  budgetMin: 0,
  budgetMax: 50,
  budgetSpecified: true,
  budgetConstraint: "hard" as const,
  occasion: "sarmale" as const,
  color: "any" as const,
  sweetness: "any" as const,
  preferredWinerySlugs: [],
  absurdRequest: false,
};

afterEach(() => {
  setSecondaryScoringModeForTests(null);
});

describe("secondary scoring mode", () => {
  it("defaults to shadow, never live", () => {
    expect(parseSecondaryScoringMode(undefined)).toBe("shadow");
    expect(parseSecondaryScoringMode("")).toBe("shadow");
    expect(parseSecondaryScoringMode("nonsense")).toBe("shadow");
    expect(parseSecondaryScoringMode("LIVE")).toBe("live");
  });

  it("shadow does not change public gift ranking or display vs stored scores", () => {
    setSecondaryScoringModeForTests("shadow");
    const wines = [
      catalogWine({ id: 1, slug: "stored-high", giftScore: 80, valueScore: 60 }),
      catalogWine({ id: 2, slug: "stored-low", giftScore: 60, valueScore: 90, estimatedQuality: 90 }),
    ];
    const list = resolveTopList("vinuri-cadou", wines);
    expect(list?.wines[0]?.slug).toBe("stored-high");
    expect(list?.rankScores[0]).toBe(80);
    expect(topListRankScore(list!.wines[0]!, "gift", list!.rankScores[0])).toBe(80);
    expect(publicGiftScoreDisplay(wines[0]!).score).toBe(80);
    expect(publicFoodScoreDisplay(wines[0]!).score).toBe(80);
  });

  it("shadow does not change public occasion display vs stored food/value", () => {
    setSecondaryScoringModeForTests("shadow");
    const wines = [
      catalogWine({
        id: 1,
        slug: "alpha",
        priceAvg: 40,
        foodMatchScore: 70,
        valueScore: 60,
        foodPairings: [{ dish: "Sarmale" }],
      }),
      catalogWine({
        id: 2,
        slug: "beta",
        priceAvg: 42,
        foodMatchScore: 96,
        valueScore: 90,
      }),
    ];
    const list = resolveTopList("vinuri-sub-50-lei-pentru-sarmale", wines);
    expect(list).not.toBeNull();
    if (!list) return;
    for (const [index, wine] of list.wines.entries()) {
      expect(list.rankScores[index]).toBe(wine.foodMatchScore ?? wine.valueScore);
      expect(topListRankScore(wine, list.rankMetric, list.rankScores[index])).toBe(
        list.rankScores[index],
      );
    }
  });

  it("live uses one v2 system for ranking and display", () => {
    setSecondaryScoringModeForTests("live");
    const wines = [
      catalogWine({
        id: 1,
        slug: "alpha",
        priceAvg: 40,
        foodPairings: [{ dish: "Sarmale" }],
        foodMatchScore: 40,
        giftScore: 40,
      }),
      catalogWine({
        id: 2,
        slug: "beta",
        priceAvg: 42,
        valueScore: 90,
        foodMatchScore: 96,
        giftScore: 80,
      }),
    ];
    const list = resolveTopList("vinuri-sub-50-lei-pentru-sarmale", wines);
    const recs = recommendWinesLive(wines, sommelierInput, 10);
    expect(list).not.toBeNull();
    if (!list) return;
    expect(list.wines.map((wine) => wine.slug)).toEqual(recs.map((rec) => rec.wine.slug));
    expect(list.rankScores).toEqual(recs.map((rec) => rec.matchScore));
    expect(recommendWines(wines, sommelierInput, 10).map((rec) => rec.matchScore)).toEqual(
      recs.map((rec) => rec.matchScore),
    );
  });
});
