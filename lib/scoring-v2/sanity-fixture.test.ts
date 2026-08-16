/**
 * Reusable calibration fixture. Expectations are relational, not exact scores.
 */
import { describe, expect, it } from "vitest";
import { scoreWineForDish } from "@/lib/recommendation/dish-match";
import {
  rankWinesForOccasion,
  type OccasionMatchWine,
} from "@/lib/recommendation/occasion-match";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { publicFoodScoreDisplay } from "@/lib/scoring-v2/public-secondary-display";
import { setSecondaryScoringModeForTests } from "@/lib/scoring-v2/secondary-scoring-mode";

function wine(
  overrides: Partial<OccasionMatchWine> & { slug: string; id: number },
): OccasionMatchWine {
  return {
    name: overrides.slug,
    type: "red",
    sweetness: "sec",
    priceAvg: 55,
    valueScore: 70,
    estimatedQuality: 72,
    grapeVarieties: [{ name: "Merlot" }],
    region: { name: "Dealu Mare" },
    winery: { name: "Crama Test", slug: "crama-test" },
    vintage: 2022,
    foodPairings: [],
    ...overrides,
  };
}

const FIXTURE: OccasionMatchWine[] = [
  wine({
    id: 1,
    slug: "red-high-data",
    type: "red",
    foodPairings: [{ dish: "sarmale" }, { dish: "branza" }, { dish: "paste" }],
    qualityFinal: 86,
    criticScore: 91,
    winery: { name: "Avincis", slug: "avincis" },
  }),
  wine({
    id: 2,
    slug: "red-low-data",
    type: "red",
    grapeVarieties: [],
    region: null,
    winery: { name: "Necunoscuta", slug: "x" },
    vintage: null,
    valueScore: 88,
    estimatedQuality: null,
  }),
  wine({
    id: 3,
    slug: "red-recas-mici",
    type: "red",
    producerContent: { culinaryPairings: "Se recomanda cu mici." },
    winery: { name: "Cramele Recas", slug: "cramele-recas" },
  }),
  wine({
    id: 4,
    slug: "red-fn-demisec-chrome",
    type: "red",
    sweetness: "demisec",
    producerContent: {
      culinaryPairings:
        "Culoarea sa este rosu. La nas fructe. Pe palat rotund. Mentionam desert.",
    },
    winery: { name: "Castel Huniade", slug: "castel-huniade" },
  }),
  wine({
    id: 5,
    slug: "red-laundry",
    type: "red",
    producerContent: {
      culinaryPairings: "carne, peste, paste, branzeturi, aperitive, salate, desert",
    },
  }),
  wine({
    id: 6,
    slug: "white-high-data",
    type: "white",
    foodPairings: [{ dish: "peste" }, { dish: "legume" }],
    winery: { name: "Avincis", slug: "avincis" },
  }),
  wine({
    id: 7,
    slug: "white-grill-fish",
    type: "white",
    grapeVarieties: [{ name: "Feteasca Regala" }],
    producerContent: { culinaryPairings: "Se recomanda cu peste la gratar." },
    winery: { name: "Cramele Recas", slug: "cramele-recas" },
  }),
  wine({
    id: 8,
    slug: "white-low-data",
    type: "white",
    grapeVarieties: [],
    valueScore: 79,
    estimatedQuality: null,
  }),
  wine({
    id: 9,
    slug: "white-curated-cheese",
    type: "white",
    foodPairings: [{ dish: "branza" }],
  }),
  wine({
    id: 10,
    slug: "white-style-only",
    type: "white",
    sweetness: "sec",
  }),
  wine({
    id: 11,
    slug: "rose-party",
    type: "rose",
    sweetness: "sec",
    valueScore: 76,
  }),
  wine({
    id: 12,
    slug: "rose-curated",
    type: "rose",
    foodPairings: [{ dish: "pizza" }, { dish: "pui" }],
  }),
  wine({
    id: 13,
    slug: "rose-low",
    type: "rose",
    grapeVarieties: [],
    estimatedQuality: null,
  }),
  wine({
    id: 14,
    slug: "sparkling-gift",
    type: "sparkling",
    qualityFinal: 84,
    medals: [{ year: 2022, competition: "IWSC", medal: "gold" }],
  }),
  wine({
    id: 15,
    slug: "sparkling-low",
    type: "sparkling",
    grapeVarieties: [],
    estimatedQuality: null,
  }),
  wine({
    id: 16,
    slug: "sparkling-party",
    type: "sparkling",
    valueScore: 74,
    beginnerFriendly: true,
  }),
  wine({
    id: 17,
    slug: "sweet-dessert",
    type: "dessert",
    sweetness: "dulce",
    foodPairings: [{ dish: "cozonac" }],
  }),
  wine({
    id: 18,
    slug: "offdry-no-dessert",
    type: "white",
    sweetness: "demisec",
  }),
  wine({
    id: 19,
    slug: "offdry-chrome",
    type: "red",
    sweetness: "demisec",
    producerContent: {
      culinaryPairings: "Culoarea sa este. La nas. Pe palat. desert",
    },
  }),
];

describe("sanity fixture", () => {
  it("covers the required style mix", () => {
    const types = FIXTURE.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = (acc[row.type] ?? 0) + 1;
      return acc;
    }, {});
    expect(types.red).toBeGreaterThanOrEqual(5);
    expect(types.white).toBeGreaterThanOrEqual(5);
    expect(types.rose).toBeGreaterThanOrEqual(3);
    expect(types.sparkling).toBeGreaterThanOrEqual(3);
    expect(FIXTURE.filter((row) => row.sweetness === "demisec" || row.type === "dessert").length).toBeGreaterThanOrEqual(3);
  });

  it("high-data red ranks above low-data red for sarmale", () => {
    const ranked = rankWinesForOccasion(FIXTURE, { occasion: "sarmale" });
    const high = ranked.findIndex((row) => row.wine.slug === "red-high-data");
    const low = ranked.findIndex((row) => row.wine.slug === "red-low-data");
    expect(high).toBeGreaterThanOrEqual(0);
    expect(low).toBeGreaterThan(high);
  });

  it("low-data wine is low confidence and not a precise Food score in live", () => {
    setSecondaryScoringModeForTests("live");
    const low = FIXTURE.find((row) => row.slug === "red-low-data");
    expect(low).toBeTruthy();
    if (!low) return;
    const food = calculateFoodVersatility({
      type: low.type,
      sweetness: low.sweetness,
    });
    expect(food.displayable).toBe(false);
    expect(publicFoodScoreDisplay(low).score).toBeNull();
    setSecondaryScoringModeForTests(null);
  });

  it("chrome dessert wines should not be dessert recommendations", () => {
    const ranked = rankWinesForOccasion(FIXTURE, { occasion: "pentru-desert" });
    const top3 = ranked.slice(0, 3).map((row) => row.wine.slug);
    expect(top3).not.toContain("red-fn-demisec-chrome");
    expect(top3).not.toContain("offdry-chrome");
    expect(scoreWineForDish(
      FIXTURE.find((row) => row.slug === "red-fn-demisec-chrome")!,
      "desert",
    ).score).toBeLessThan(50);
  });

  it("white fish-grill is not a top meat-grill pick", () => {
    const ranked = rankWinesForOccasion(FIXTURE, { occasion: "gratar" });
    const meat = ranked.findIndex((row) => row.wine.slug === "red-recas-mici");
    const white = ranked.findIndex((row) => row.wine.slug === "white-grill-fish");
    expect(meat).toBeGreaterThanOrEqual(0);
    expect(white).toBeGreaterThan(meat);
    expect(
      scoreWineForDish(FIXTURE.find((row) => row.slug === "white-grill-fish")!, "mici")
        .score,
    ).toBeLessThan(
      scoreWineForDish(FIXTURE.find((row) => row.slug === "red-recas-mici")!, "mici")
        .score,
    );
  });
});
