import { describe, expect, it } from "vitest";
import { scoreWineForDish } from "@/lib/recommendation/dish-match";
import {
  rankWinesForOccasion,
  scoreWineForOccasion,
  type OccasionMatchWine,
} from "@/lib/recommendation/occasion-match";
import {
  assertFoodEvidencePatchHasNoScores,
  compareScoreSnapshots,
} from "@/lib/food-evidence";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import { publicFoodScoreDisplay } from "@/lib/scoring-v2/public-secondary-display";
import { setSecondaryScoringModeForTests } from "@/lib/scoring-v2/secondary-scoring-mode";

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

describe("Food calibration pairs", () => {
  it("A: curated breadth beats no-evidence same style", () => {
    const rich = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [{ dish: "sarmale" }, { dish: "branza" }, { dish: "paste" }],
    });
    const bare = calculateFoodVersatility({ type: "red", sweetness: "sec" });
    expect(rich.score).toBeGreaterThan(bare.score);
    expect(rich.confidence).toBeGreaterThan(bare.confidence);
    expect(rich.displayable).toBe(true);
    expect(bare.displayable).toBe(false);
    expect(bare.evidenceLevel).toBe("style_only");
  });

  it("B: one exact producer pairing has higher confidence than type prior", () => {
    const producer = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      producerCulinaryPairings: "Se recomanda cu sarmale.",
    });
    const prior = calculateFoodVersatility({ type: "red", sweetness: "sec" });
    expect(producer.confidence).toBeGreaterThan(prior.confidence);
    expect(producer.evidenceLevel).toBe("moderate");
    expect(prior.evidenceLevel).toBe("style_only");
  });

  it("C: mici / mititei / carne la gratar are one category", () => {
    const result = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        { dish: "mici" },
        { dish: "mititei" },
        { dish: "carne la gratar" },
      ],
    });
    expect(result.categories).toEqual(["grilled_meat"]);
  });

  it("D: a 7-category site menu is not highly versatile", () => {
    const result = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      producerCulinaryPairings:
        "carne, peste, paste, branzeturi, aperitive, salate, desert",
    });
    expect(result.score).toBeLessThan(60);
    expect(result.displayable).toBe(false);
  });

  it("E: four curated categories outrank one category", () => {
    const broad = calculateFoodVersatility({
      type: "white",
      sweetness: "sec",
      foodPairings: [
        { dish: "peste" },
        { dish: "branza" },
        { dish: "paste" },
        { dish: "legume" },
      ],
    });
    const narrow = calculateFoodVersatility({
      type: "white",
      sweetness: "sec",
      foodPairings: [{ dish: "peste" }],
    });
    expect(broad.score - narrow.score).toBeGreaterThanOrEqual(8);
  });

  it("score snapshots must stay identical after culinary writes", () => {
    const before = [
      { id: 1, valueScore: 80, giftScore: 70, foodMatchScore: 60 },
      { id: 2, valueScore: 71, giftScore: 55, foodMatchScore: 48 },
    ];
    expect(compareScoreSnapshots(before, before).identical).toBe(true);
    expect(
      compareScoreSnapshots(before, [
        { id: 1, valueScore: 80, giftScore: 70, foodMatchScore: 61 },
        { id: 2, valueScore: 71, giftScore: 55, foodMatchScore: 48 },
      ]).identical,
    ).toBe(false);
  });

  it("food evidence patches cannot include score columns", () => {
    expect(() =>
      assertFoodEvidencePatchHasNoScores({ producerContent: {} }),
    ).not.toThrow();
    expect(() => assertFoodEvidencePatchHasNoScores({ giftScore: 70 })).toThrow(
      /giftScore/,
    );
    expect(() =>
      assertFoodEvidencePatchHasNoScores({ foodMatchScore: 45 }),
    ).toThrow(/foodMatchScore/);
    expect(() => assertFoodEvidencePatchHasNoScores({ valueScore: 80 })).toThrow(
      /valueScore/,
    );
  });

  it("F: style-only baseline is not a public numeric score in live mode", () => {
    setSecondaryScoringModeForTests("live");
    const wine = matchWine({ slug: "style-only" });
    const food = calculateFoodVersatility({
      type: wine.type,
      sweetness: wine.sweetness,
    });
    expect(food.displayable).toBe(false);
    expect(publicFoodScoreDisplay(wine).score).toBeNull();
    expect(publicFoodScoreDisplay(wine).caption).toBe(
      "Avem încă puține dovezi pentru un scor general de versatilitate.",
    );
    setSecondaryScoringModeForTests(null);
  });
});

describe("Gift confidence calibration", () => {
  it("does not reach 96 from quality prior plus producer URL", () => {
    const result = calculateGiftScore({
      type: "red",
      grapeVarieties: ["Feteasca Neagra"],
      region: "Recas",
      wineryName: "Cramele Recas",
      vintage: 2022,
      estimatedQuality: 74,
      producerPageUrl: "https://www.cramelerecas.ro/vin/x",
      sweetness: "sec",
    });
    expect(result.confidence).toBeLessThan(80);
    expect(result.confidence).toBeLessThan(90);
  });

  it("requires strong components for confidence 90+", () => {
    const weak = calculateGiftScore({
      type: "red",
      grapeVarieties: ["Merlot"],
      estimatedQuality: 80,
      producerPageUrl: "https://example.com",
      valueScore: 70,
    });
    const strong = calculateGiftScore({
      type: "red",
      grapeVarieties: ["Merlot"],
      qualityFinal: 88,
      criticScore: 92,
      medals: [{ year: 2023, competition: "IWSC", medal: "gold" }],
      tastingSheetUrl: "https://example.com/fisa.pdf",
      valueScore: 78,
      region: "Dealu Mare",
      wineryName: "Crama Test",
      vintage: 2021,
    });
    expect(weak.confidence).toBeLessThan(80);
    expect(strong.confidence).toBeGreaterThan(weak.confidence);
  });
});

describe("cadou vs cadou-business", () => {
  it("prefers completeness and confidence for business, distinctiveness for general gift", () => {
    const distinctive = matchWine({
      slug: "autohton",
      grapeVarieties: [{ name: "Feteasca Neagra" }],
      valueScore: 82,
      estimatedQuality: 74,
      medals: [],
    });
    const complete = matchWine({
      slug: "complet",
      id: 2,
      grapeVarieties: [{ name: "Merlot" }],
      valueScore: 68,
      qualityFinal: 86,
      criticScore: 90,
      medals: [{ year: 2023, competition: "IWSC", medal: "gold" }],
      alcohol: 13.5,
      vintage: 2020,
    });
    const giftRank = rankWinesForOccasion([distinctive, complete], { occasion: "cadou" });
    const businessRank = rankWinesForOccasion([distinctive, complete], {
      occasion: "cadou-business",
    });
    expect(giftRank.map((row) => row.wine.slug)).not.toEqual(
      businessRank.map((row) => row.wine.slug),
    );
  });
});

describe("dessert and grill sanity", () => {
  it("strips Recas cookie tails and rejects tasting-only culinary as dessert proof", () => {
    const wine = matchWine({
      slug: "fn-stored-chrome",
      type: "red",
      sweetness: "demisec",
      producerContent: {
        culinaryPairings:
          "Rosu rubiniu intens. Gustativ, vinul are un corp mediu. Taninurile sunt rotunde. O dulceata placuta. Cramele Recas promoveaza consumul responsabil de alcool. Acest site foloseste cookies. Manage consent. Cookieuri necesare.",
      },
    });
    const dessert = scoreWineForDish(wine, "desert");
    expect(dessert.score).toBeLessThan(50);
    expect(dessert.evidenceLevel).toBeGreaterThan(2);
  });

  it("does not treat tasting-chrome dessert mention as an 82 dish match", () => {
    const wine = matchWine({
      slug: "fn-demisec",
      type: "red",
      sweetness: "demisec",
      producerContent: {
        culinaryPairings:
          "Culoarea sa este rosu. La nas arome de fructe. Pe palat rotund. Optional desert.",
      },
    });
    const dessert = scoreWineForDish(wine, "desert");
    expect(dessert.score).toBeLessThan(50);
    expect(dessert.evidenceLevel).toBeGreaterThan(2);
  });

  it("does not equate peste la gratar with mici", () => {
    const whiteFish = matchWine({
      slug: "fr-alb",
      type: "white",
      producerContent: { culinaryPairings: "Se recomanda cu peste la gratar." },
    });
    const redMici = matchWine({
      slug: "fn-mici",
      id: 2,
      type: "red",
      producerContent: { culinaryPairings: "Se recomanda cu mici." },
    });
    const whiteForMici = scoreWineForDish(whiteFish, "mici");
    const redForMici = scoreWineForDish(redMici, "mici");
    const whiteForFishGrill = scoreWineForDish(whiteFish, "peste la gratar");
    expect(whiteForFishGrill.score).toBeGreaterThan(whiteForMici.score);
    expect(redForMici.score).toBeGreaterThan(whiteForMici.score);
  });
});

describe("low-confidence recommendation ceiling", () => {
  it("cannot dominate as a high-confidence top choice", () => {
    const thin = scoreWineForOccasion(
      matchWine({
        slug: "thin",
        grapeVarieties: [],
        region: null,
        winery: null,
        vintage: null,
        valueScore: 92,
        estimatedQuality: null,
        sweetness: null,
      }),
      { occasion: "oricare" },
    );
    expect(thin?.confidence).toBeLessThan(50);
    expect(thin?.score).toBeLessThanOrEqual(72);
  });
});
