import { describe, expect, it } from "vitest";
import { categorizeFoodText } from "@/lib/food-taxonomy";
import {
  buildCurationWritePatch,
  lockDraftBasis,
  toApprovedFoodPairings,
  validatePairingDrafts,
} from "@/lib/pairing-curation";
import { findRomanianDishByName } from "@/lib/pairing/romanian-dishes";
import { classifyProducerProvenance } from "@/lib/pairing/producer-provenance";
import { evidenceContextFromPairingFields } from "@/lib/curated-evidence";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import { scoreWineForDish } from "@/lib/recommendation/dish-match";
import { scoreWineForOccasion } from "@/lib/recommendation/occasion-match";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: 55,
    name: slug,
    slug,
    type: "red",
    sweetness: "sec",
    status: "verified",
    foodPairings: [],
    producerContent: null,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    valueScore: 71,
    giftScore: 63,
    foodMatchScore: 52,
    alcohol: 13.8,
    winery: { name: "Recas", slug: "cramele-recas" },
    ...rest,
  } as WineWithRelations;
}

function draft(overrides: Partial<PairingDraft> = {}): PairingDraft {
  return {
    dish: "Tocanita de vanat",
    category: "game",
    rationale: "Un rosu sec din acest stil poate sta langa tocanita de vanat.",
    basis: ["producer_evidence", "verified_style", "editorial_judgment"],
    confidence: "HIGH",
    strength: "strong",
    styleOnlyWarning: false,
    provenanceLocked: true,
    ...overrides,
  };
}

describe("game / vanat food taxonomy", () => {
  it("A: Tocanita de vanat maps to game", () => {
    expect(categorizeFoodText("Tocanita de vanat")).toEqual(["game"]);
  });

  it("B: tocanita de vânat maps to game", () => {
    expect(categorizeFoodText("tocanita de vânat")).toEqual(["game"]);
  });

  it("C: carne de mistret maps to game", () => {
    expect(categorizeFoodText("carne de mistret")).toEqual(["game"]);
  });

  it("D: caprioara maps to game", () => {
    expect(categorizeFoodText("caprioara")).toEqual(["game"]);
    expect(categorizeFoodText("căprioară")).toEqual(["game"]);
  });

  it("does not map game onto beef, pork, or poultry", () => {
    expect(categorizeFoodText("tocanita de vanat")).not.toContain("beef");
    expect(categorizeFoodText("carne de cerb")).not.toContain("pork");
    expect(categorizeFoodText("carne de mistret")).not.toContain("poultry");
  });

  it("keeps rabbit as poultry, not game", () => {
    expect(categorizeFoodText("iepure la cuptor")).toEqual(["poultry"]);
    expect(findRomanianDishByName("Iepure la cuptor")?.foodCategory).toBe(
      "poultry",
    );
    expect(findRomanianDishByName("Tocanita de vanat")?.foodCategory).toBe(
      "game",
    );
  });

  it("E: exact producer tocanite de vanat supports Tocanita de vanat", () => {
    const item = wine({
      slug: "selene-vanat",
      producerContent: {
        culinaryPairings: "Se recomanda cu tocanite de vanat.",
        foodEvidence: [
          {
            category: "game",
            dish: "tocanite de vanat",
            sourceType: "producer_page",
            excerpt: "Se recomanda cu tocanite de vanat.",
            extractionMethod: "deterministic",
            evidenceClass: "PRODUCER_EXACT",
            confidence: 80,
          },
        ],
      },
    });
    const context = evidenceContextFromPairingFields({
      type: item.type,
      producerCulinaryPairings: item.producerContent?.culinaryPairings,
      foodEvidence: item.producerContent?.foodEvidence,
    });
    expect(
      classifyProducerProvenance(context, "Tocanita de vanat", "game"),
    ).toBe("EXACT_PRODUCER");
    const locked = lockDraftBasis(item, draft());
    expect(locked.basis.includes("producer_evidence")).toBe(true);
    const issues = validatePairingDrafts(item, [locked]);
    expect(issues.some((row) => row.level === "error")).toBe(false);
    const approved = toApprovedFoodPairings([locked], []);
    expect(approved[0]?.source).toBe("vinintel_curated");
    expect(approved[0]?.basis).toContain("producer_evidence");
    expect(approved[0]?.strength).toBe("strong");
    expect(approved[0]?.category).toBe("game");
  });

  it("F: unrelated generic dish is still rejected", () => {
    const item = wine({ slug: "unknown-dish" });
    const issues = validatePairingDrafts(item, [
      draft({
        dish: "Fel inventat xyzzy",
        category: "game",
        basis: ["verified_style", "editorial_judgment"],
        rationale: "Un rosu sec din acest stil este o alegere editoriala.",
      }),
    ]);
    expect(issues.some((row) => row.code === "unknown_category")).toBe(true);
  });

  it("G: Value/Gift/Food stored scores remain unchanged", () => {
    const item = wine({
      slug: "scores-unchanged",
      valueScore: 71,
      giftScore: 63,
      foodMatchScore: 52,
    });
    categorizeFoodText("Tocanita de vanat");
    scoreWineForDish(item, "Tocanita de vanat");
    expect(item.valueScore).toBe(71);
    expect(item.giftScore).toBe(63);
    expect(item.foodMatchScore).toBe(52);
    const patch = buildCurationWritePatch(
      toApprovedFoodPairings(
        [
          draft({
            basis: ["verified_style", "editorial_judgment"],
          }),
        ],
        [],
      ),
    );
    expect("valueScore" in patch).toBe(false);
    expect("giftScore" in patch).toBe(false);
    expect("foodMatchScore" in patch).toBe(false);
  });

  it("H: SECONDARY_SCORING_MODE remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
  });

  it("dish match, food versatility, and occasion match accept game without crashing", () => {
    const item = wine({
      slug: "dish-match-game",
      foodPairings: [
        {
          dish: "Tocanita de vanat",
          category: "game",
          source: "vinintel_curated",
          basis: ["producer_evidence"],
          strength: "strong",
        },
      ],
    });
    const dish = scoreWineForDish(item, "Tocanita de vanat");
    expect(Number.isFinite(dish.score)).toBe(true);
    expect(dish.categoryMatched).toBe(true);
    const versatility = calculateFoodVersatility({
      type: item.type,
      sweetness: item.sweetness,
      foodPairings: item.foodPairings,
    });
    expect(Number.isFinite(versatility.score)).toBe(true);
    expect(versatility.categories).toContain("game");
    const occasion = scoreWineForOccasion(item, {
      occasion: "oricare",
      dish: "Tocanita de vanat",
    });
    expect(occasion).not.toBeNull();
    expect(Number.isFinite(occasion?.score ?? Number.NaN)).toBe(true);
  });
});
