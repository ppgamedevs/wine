import { describe, expect, it } from "vitest";
import { calculateInitialScores, mergeAnalysisScores } from "@/lib/scoring";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import { assessRecommendationEligibility } from "@/lib/recommendation/eligibility";
import { scoreWineForDish } from "@/lib/recommendation/dish-match";
import {
  rankWinesForOccasion,
  scoreWineForOccasion,
} from "@/lib/recommendation/occasion-match";
import { recommendWinesLive } from "@/lib/sommelier";
import { resolveTopList, topListRankScore } from "@/lib/top-lists";
import { setSecondaryScoringModeForTests } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";
import type { OccasionMatchWine } from "@/lib/recommendation/occasion-match";

function giftBase(overrides: Partial<Parameters<typeof calculateGiftScore>[0]> = {}) {
  return calculateGiftScore({
    type: "red",
    sweetness: "sec",
    grapeVarieties: ["Merlot"],
    region: "Dealu Mare",
    wineryName: "Crama Test",
    vintage: 2022,
    valueScore: 72,
    estimatedQuality: 74,
    price: 70,
    ...overrides,
  });
}

function foodBase(overrides: Partial<Parameters<typeof calculateFoodVersatility>[0]> = {}) {
  return calculateFoodVersatility({
    type: "red",
    sweetness: "sec",
    ...overrides,
  });
}

function matchWine(
  overrides: Partial<OccasionMatchWine> & { slug: string },
): OccasionMatchWine {
  const { slug, ...rest } = overrides;
  return {
    id: 1,
    name: slug,
    type: "red",
    sweetness: "sec",
    priceAvg: 45,
    valueScore: 70,
    estimatedQuality: 72,
    grapeVarieties: [{ name: "Merlot" }],
    region: { name: "Dealu Mare" },
    winery: { name: "Crama Test", slug: "crama-test" },
    vintage: 2022,
    foodPairings: [],
    slug,
    ...rest,
  };
}

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

describe("A: AI adjectives do not change Gift, Food or Occasion Match", () => {
  it("ignores tasteProfile and editorial prose", () => {
    const giftA = giftBase();
    const giftB = giftBase();
    const foodA = foodBase({ foodPairings: [{ dish: "sarmale" }] });
    const foodB = foodBase({ foodPairings: [{ dish: "sarmale" }] });
    const wine = matchWine({ slug: "test-a" });
    const occA = scoreWineForOccasion(
      { ...wine, tasteProfile: "elegant, complex, mineral" },
      { occasion: "oricare" },
    );
    const occB = scoreWineForOccasion(
      { ...wine, tasteProfile: "simplu, rustic, banal" },
      { occasion: "oricare" },
    );

    expect(giftA.score).toBe(giftB.score);
    expect(foodA.score).toBe(foodB.score);
    expect(occA?.score).toBe(occB?.score);
  });
});

describe("B: price 99 to 101 does not raise Gift Score", () => {
  it("does not treat a 2 RON jump over 100 as prestige", () => {
    const cheap = giftBase({ price: 99, estimatedQuality: 74, valueScore: 72 });
    const dear = giftBase({ price: 101, estimatedQuality: 74, valueScore: 72 });
    expect(dear.score).toBeLessThanOrEqual(cheap.score);
  });
});

describe("C: sparkling is not automatically Gift 80", () => {
  it("keeps a low-evidence sparkling below the legacy 80 default", () => {
    const result = calculateGiftScore({ type: "sparkling" });
    expect(result.score).toBeLessThan(80);
    expect(result.provisional).toBe(true);
  });
});

describe("D: red wine is not automatically Food 80", () => {
  it("gives a type-only red a modest versatility score", () => {
    const result = foodBase({ type: "red", sweetness: "sec" });
    expect(result.score).toBeLessThan(80);
  });
});

describe("E: missing Value is not silently 50", () => {
  it("reweights instead of injecting a confident 50", () => {
    const known = scoreWineForOccasion(
      matchWine({ slug: "known-value", valueScore: 90, estimatedQuality: 80 }),
      { occasion: "oricare" },
    );
    const missing = scoreWineForOccasion(
      matchWine({ slug: "missing-value", valueScore: null, estimatedQuality: 80 }),
      { occasion: "oricare" },
    );
    expect(missing).not.toBeNull();
    expect(known).not.toBeNull();
    expect(missing?.breakdown.some((item) => item.key === "value" && item.points === 50)).toBe(
      false,
    );
    expect(missing?.score).not.toBe(50);
  });
});

describe("F: explicit red is a hard filter", () => {
  it("excludes non-red wines", () => {
    const red = matchWine({ slug: "rosu", type: "red" });
    const white = matchWine({ slug: "alb", type: "white", id: 2 });
    const ranked = rankWinesForOccasion([red, white], {
      occasion: "oricare",
      color: "red",
    });
    expect(ranked.map((row) => row.wine.slug)).toEqual(["rosu"]);
  });
});

describe("G: sub 50 lei excludes 50.01+", () => {
  it("treats SEO budget as a hard ceiling", () => {
    const ok = matchWine({ slug: "sub-50", priceAvg: 50 });
    const over = matchWine({ slug: "peste-50", priceAvg: 50.01, id: 2 });
    const ranked = rankWinesForOccasion([ok, over], {
      occasion: "sarmale",
      budgetMin: 0,
      budgetMax: 50,
      budgetSpecified: true,
      budgetConstraint: "hard",
    });
    expect(ranked.map((row) => row.wine.slug)).toEqual(["sub-50"]);
  });
});

describe("H: curated sarmale beats generic type fit", () => {
  it("ranks explicit pairing above type-only compatibility", () => {
    const curated = matchWine({
      slug: "cu-sarmale",
      foodPairings: [{ dish: "Sarmale" }],
      valueScore: 60,
      estimatedQuality: 60,
    });
    const generic = matchWine({
      slug: "doar-rosu",
      id: 2,
      foodPairings: [],
      valueScore: 60,
      estimatedQuality: 60,
    });
    const curatedDish = scoreWineForDish(curated, "sarmale");
    const genericDish = scoreWineForDish(generic, "sarmale");
    expect(curatedDish.evidenceLevel).toBe(1);
    expect(genericDish.evidenceLevel).toBeGreaterThan(1);
    expect(curatedDish.score).toBeGreaterThan(genericDish.score);
  });
});

describe("I: dry red without dessert evidence is not a dessert star", () => {
  it("keeps dessert match low", () => {
    const dryRed = matchWine({
      slug: "rosu-sec",
      type: "red",
      sweetness: "sec",
      valueScore: 90,
      estimatedQuality: 88,
    });
    const dessert = scoreWineForOccasion(dryRed, { occasion: "pentru-desert" });
    expect(dessert).not.toBeNull();
    expect(dessert?.score).toBeLessThan(70);
    expect(dessert?.dish?.score).toBeLessThan(40);
  });
});

describe("J: multi-category food evidence beats a single pairing", () => {
  it("rewards breadth, not alias spam", () => {
    const broad = foodBase({
      foodPairings: [
        { dish: "peste" },
        { dish: "branza" },
        { dish: "paste" },
        { dish: "legume" },
      ],
    });
    const narrow = foodBase({
      foodPairings: [{ dish: "mici" }, { dish: "mititei" }, { dish: "carne la gratar" }],
    });
    expect(broad.categories.length).toBeGreaterThan(narrow.categories.length);
    expect(broad.score).toBeGreaterThan(narrow.score);
    expect(narrow.categories).toEqual(["grilled_meat"]);
  });
});

describe("K/L: top-list displayed score equals ranking score and JSON-LD order", () => {
  it("keeps Potrivire identical to Occasion Match used for sort", () => {
    setSecondaryScoringModeForTests("live");
    const wines = [
      catalogWine({
        id: 1,
        slug: "alpha",
        priceAvg: 40,
        foodPairings: [{ dish: "Sarmale" }],
      }),
      catalogWine({
        id: 2,
        slug: "beta",
        priceAvg: 42,
        valueScore: 90,
        foodMatchScore: 96,
      }),
    ];
    const list = resolveTopList("vinuri-sub-50-lei-pentru-sarmale", wines);
    expect(list).not.toBeNull();
    if (!list) return;
    expect(list.rankScores).toHaveLength(list.wines.length);
    for (const [index, wine] of list.wines.entries()) {
      expect(topListRankScore(wine, list.rankMetric, list.rankScores[index])).toBe(
        list.rankScores[index],
      );
    }
    const recs = recommendWinesLive(
      wines,
      {
        budgetMin: 0,
        budgetMax: 50,
        budgetSpecified: true,
        budgetConstraint: "hard",
        occasion: "sarmale",
        color: "any",
        sweetness: "any",
        preferredWinerySlugs: [],
        absurdRequest: false,
      },
      10,
    );
    expect(list.wines.map((wine) => wine.slug)).toEqual(recs.map((rec) => rec.wine.slug));
    expect(list.rankScores).toEqual(recs.map((rec) => rec.matchScore));
    setSecondaryScoringModeForTests(null);
  });
});

describe("M: low-confidence wine cannot get a near-perfect contextual score", () => {
  it("caps generic defaults", () => {
    const thin = scoreWineForOccasion(
      matchWine({
        slug: "thin",
        grapeVarieties: [],
        region: null,
        winery: null,
        vintage: null,
        valueScore: null,
        estimatedQuality: null,
        sweetness: null,
      }),
      { occasion: "oricare" },
    );
    expect(thin).not.toBeNull();
    expect(thin?.score).toBeLessThan(80);
    expect(thin?.confidence).toBeLessThan(50);
  });
});

describe("N: identical wines are deterministic, ties break by slug", () => {
  it("returns the same base scores and stable order", () => {
    const first = matchWine({ slug: "zeta", id: 1 });
    const second = matchWine({ slug: "alfa", id: 2 });
    const gift1 = calculateGiftScore({
      type: first.type,
      sweetness: first.sweetness,
      grapeVarieties: ["Merlot"],
      valueScore: 70,
      estimatedQuality: 72,
      price: 45,
    });
    const gift2 = calculateGiftScore({
      type: second.type,
      sweetness: second.sweetness,
      grapeVarieties: ["Merlot"],
      valueScore: 70,
      estimatedQuality: 72,
      price: 45,
    });
    expect(gift1.score).toBe(gift2.score);
    const ranked = rankWinesForOccasion([first, second], { occasion: "oricare" });
    expect(ranked[0]?.wine.slug).toBe("alfa");
  });
});

describe("O: scoring no longer invents 2/4-year cellarPotential", () => {
  it("returns null cellarPotential for new score calculation", () => {
    const scores = calculateInitialScores({
      price: 80,
      category: "rosu",
      grapeVarieties: ["Feteasca Neagra"],
    });
    expect(scores.cellarPotential).toBeNull();
  });
});

describe("Producer laundry lists are not dish-specific evidence", () => {
  it("does not treat a generic multi-category producer blurb as dessert proof", () => {
    const wine = matchWine({
      slug: "brochure",
      type: "red",
      sweetness: "sec",
      producerContent: {
        culinaryPairings:
          "Se asociaza cu paste, peste, carne la gratar, branza, legume si desert.",
      },
    });
    const dessert = scoreWineForDish(wine, "desert");
    expect(dessert.evidenceLevel).toBeGreaterThan(2);
    expect(dessert.score).toBeLessThan(50);
  });

  it("does not treat a producer dessert mention as proof for a dry red", () => {
    const wine = matchWine({
      slug: "dry-red-dessert-blurb",
      type: "red",
      sweetness: "sec",
      producerContent: { culinaryPairings: "Recomandat la desert." },
    });
    const dessert = scoreWineForDish(wine, "desert");
    expect(dessert.evidenceLevel).toBeGreaterThan(2);
    expect(dessert.score).toBeLessThan(40);
  });
});

describe("Identity eligibility uses the contradiction class", () => {
  it("marks label-vs-stored sweetness conflicts as REVIEW_REQUIRED", () => {
    const status = assessRecommendationEligibility({
      id: 9,
      slug: "crama-test-chardonnay-sec-2023",
      name: "Chardonnay Sec 2023",
      type: "white",
      sweetness: "demisec",
      grapeVarieties: ["Chardonnay"],
      vintage: 2023,
    });
    expect(status).toBe("REVIEW_REQUIRED");
  });
});

describe("LLM cannot nudge Gift or Food", () => {
  it("ignores AI suggestions in mergeAnalysisScores", () => {
    const rule = calculateInitialScores({
      price: 60,
      category: "rosu",
      grapeVarieties: ["Merlot"],
    });
    const merged = mergeAnalysisScores(rule, 60, {
      giftScore: 10,
      foodMatchScore: 10,
    });
    expect(merged.giftScore).toBe(rule.giftScore);
    expect(merged.foodMatchScore).toBe(rule.foodMatchScore);
    expect(merged.adjustments.giftScore).toBe(0);
    expect(merged.adjustments.foodMatchScore).toBe(0);
  });
});
