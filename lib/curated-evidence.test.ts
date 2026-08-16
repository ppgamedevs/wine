import { describe, expect, it } from "vitest";
import {
  curatedEvidenceTier,
  hasSafeProducerEvidenceForCategory,
  sanitizeCuratedBasis,
} from "@/lib/curated-evidence";
import { scoreWineForDish } from "@/lib/recommendation/dish-match";
import {
  generatePairingDrafts,
  lockDraftBasis,
  previewCurationImpact,
  toApprovedFoodPairings,
  validatePairingDrafts,
  type PairingDraft,
} from "@/lib/pairing-curation";
import { buildCurationWritePatch } from "@/lib/pairing-curation";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: 21,
    name: slug,
    slug,
    type: "red",
    sweetness: "sec",
    status: "verified",
    foodPairings: [],
    producerContent: null,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    valueScore: 70,
    giftScore: 60,
    foodMatchScore: 44,
    alcohol: 13.5,
    winery: { name: "Balla Geza", slug: "balla-geza" },
    ...rest,
  } as WineWithRelations;
}

function draft(overrides: Partial<PairingDraft> = {}): PairingDraft {
  return {
    dish: "Sarmale",
    category: "sarmale",
    rationale: "Un rosu sec din acest stil este o alegere editoriala pentru sarmale.",
    basis: ["verified_style", "editorial_judgment"],
    confidence: "MEDIUM",
    strength: "good",
    styleOnlyWarning: true,
    provenanceLocked: true,
    ...overrides,
  };
}

describe("curated evidence semantics", () => {
  it("A: three editorial pairings are not equivalent to three producer-backed pairings", () => {
    const editorial = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["editorial_judgment"],
        },
        {
          dish: "Mici",
          source: "vinintel_curated",
          basis: ["editorial_judgment"],
        },
        {
          dish: "Branzeturi maturate",
          source: "vinintel_curated",
          basis: ["editorial_judgment"],
        },
      ],
    });
    const sourced = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      producerCulinaryPairings: "Se recomanda cu sarmale.",
      foodEvidence: [
        {
          category: "sarmale",
          dish: "sarmale",
          sourceType: "producer_page",
          excerpt: "Se recomanda cu sarmale.",
          extractionMethod: "deterministic",
          evidenceClass: "PRODUCER_EXACT",
          confidence: 80,
        },
        {
          category: "grilled_meat",
          dish: "mici",
          sourceType: "producer_page",
          excerpt: "Se recomanda cu mici.",
          extractionMethod: "deterministic",
          evidenceClass: "PRODUCER_EXACT",
          confidence: 80,
        },
        {
          category: "cheese",
          dish: "branza",
          sourceType: "producer_page",
          excerpt: "Se recomanda cu branzeturi maturate.",
          extractionMethod: "deterministic",
          evidenceClass: "PRODUCER_EXACT",
          confidence: 80,
        },
      ],
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["producer_evidence"],
        },
        {
          dish: "Mici",
          source: "vinintel_curated",
          basis: ["producer_evidence"],
        },
        {
          dish: "Branzeturi maturate",
          source: "vinintel_curated",
          basis: ["producer_evidence"],
        },
      ],
    });
    expect(sourced.confidence).toBeGreaterThan(editorial.confidence);
    expect(sourced.evidenceLevel).toBe("strong");
    expect(editorial.evidenceLevel).not.toBe("strong");
  });

  it("B: human approval increases usefulness without manufacturing bottle evidence", () => {
    const before = calculateFoodVersatility({ type: "red", sweetness: "sec" });
    const after = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
        {
          dish: "Mici",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
        {
          dish: "Branzeturi maturate",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
      ],
    });
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.confidence).toBeGreaterThan(before.confidence);
    expect(after.confidence).toBeLessThan(60);
    expect(after.evidenceProvenance).not.toBe("source_backed");
  });

  it("C: exact curated sarmale strongly improves Sarmale Match", () => {
    const curated = wine({
      slug: "fn-sarmale",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
      ],
    });
    const generic = wine({ slug: "fn-generic" });
    const curatedDish = scoreWineForDish(curated, "sarmale");
    const genericDish = scoreWineForDish(generic, "sarmale");
    expect(curatedDish.score).toBeGreaterThanOrEqual(88);
    expect(curatedDish.evidenceLevel).toBe(1);
    expect(curatedDish.score).toBeGreaterThan(genericDish.score);
  });

  it("D: exact curated sarmale does not make global Food exceptional", () => {
    const food = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
      ],
    });
    expect(food.evidenceLevel).not.toBe("strong");
    expect(food.score).toBeLessThan(70);
  });

  it("E: producer exact plus curated approval does not double-count the category", () => {
    const producerOnly = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      producerCulinaryPairings: "Se recomanda cu sarmale.",
    });
    const both = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      producerCulinaryPairings: "Se recomanda cu sarmale.",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["producer_evidence"],
        },
      ],
    });
    expect(both.categories).toEqual(producerOnly.categories);
    expect(both.confidence - producerOnly.confidence).toBeLessThanOrEqual(8);
  });

  it("F: producer_evidence is rejected without supporting producer evidence", () => {
    const item = wine({ slug: "no-producer" });
    const issues = validatePairingDrafts(item, [
      draft({ basis: ["producer_evidence"] }),
    ]);
    expect(issues.some((issue) => issue.code === "fake_producer_basis")).toBe(true);
    expect(() => lockDraftBasis(item, draft({ basis: ["producer_evidence"] }))).toThrow(
      /producer_evidence/,
    );
  });

  it("G: strength=strong does not raise factual evidence confidence", () => {
    const good = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["editorial_judgment"],
          strength: "good",
        },
      ],
    });
    const strong = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["editorial_judgment"],
          strength: "strong",
        },
      ],
    });
    expect(strong.confidence).toBe(good.confidence);
    expect(strong.score).toBe(good.score);
  });

  it("H: generic red-style curated suggestions do not become strong by count", () => {
    const food = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
        {
          dish: "Mici",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
        {
          dish: "Branzeturi maturate",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
        {
          dish: "Ceafa de porc",
          source: "vinintel_curated",
          basis: ["verified_style", "editorial_judgment"],
        },
      ],
    });
    expect(food.evidenceLevel).not.toBe("strong");
    expect(food.score).toBeLessThan(70);
  });

  it("I: curated editorial wines may become displayable under an honest semantic", () => {
    const food = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [
        {
          dish: "Sarmale",
          source: "vinintel_curated",
          basis: ["editorial_judgment"],
        },
      ],
    });
    expect(food.displayable).toBe(true);
    expect(["curated_editorial", "moderate"]).toContain(food.evidenceLevel);
    expect(food.provisional).toBe(true);
  });

  it("J: legacy FoodPairing without metadata remains safe and not producer-backed", () => {
    const pairing = { dish: "sarmale" };
    expect(curatedEvidenceTier(pairing, { type: "red", sweetness: "sec" })).toBe(
      "editorial",
    );
    const food = calculateFoodVersatility({
      type: "red",
      sweetness: "sec",
      foodPairings: [pairing],
    });
    expect(food.score).toBeGreaterThan(0);
    expect(food.evidenceProvenance).not.toBe("source_backed");
  });

  it("K: shadow mode remains unchanged publicly", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
  });

  it("L: curation write patch still cannot include stored scores", () => {
    const patch = buildCurationWritePatch(
      toApprovedFoodPairings([draft()], []),
    );
    expect("giftScore" in patch).toBe(false);
    expect("foodMatchScore" in patch).toBe(false);
    expect("valueScore" in patch).toBe(false);
  });

  it("M: fish/poultry producer text cannot mint dessert producer backing", () => {
    const item = wine({
      slug: "rose-fish-class",
      type: "rose",
      producerContent: {
        culinaryPairings:
          "Salate cu peste; Preparate la cuptor pe baza de curcan; Somon la gratar; Fructe de mare; Tartar de ton sau somon.",
        foodEvidence: [
          {
            category: "dessert",
            dish: "cozonac",
            sourceType: "producer_page",
            excerpt:
              "Salate cu peste; Preparate la cuptor pe baza de curcan; Somon la gratar; Fructe de mare; Tartar de ton sau somon.",
            extractionMethod: "deterministic",
            evidenceClass: "PRODUCER_EXACT",
            confidence: 70,
          },
        ],
      },
    });
    const drafts = generatePairingDrafts(item);
    expect(
      drafts.some(
        (row) =>
          (row.category === "dessert" || row.dish.toLowerCase().includes("cozonac")) &&
          row.basis.includes("producer_evidence"),
      ),
    ).toBe(false);
    expect(
      hasSafeProducerEvidenceForCategory(
        {
          type: "rose",
          producerCulinary: item.producerContent?.culinaryPairings,
          foodEvidence: item.producerContent?.foodEvidence,
        },
        "dessert",
      ),
    ).toBe(false);
  });

  it("N: laundry producer lists cannot be laundered into strong curated provenance", () => {
    const item = wine({
      slug: "laundry-class",
      producerContent: {
        culinaryLaundryRejected: true,
        culinaryPairings:
          "Cotlet de miel; Piept de rata; Paste cu trufe; Antricot de vita; Filet mignon; Ciocolata; Branzeturi; Desert.",
        foodEvidence: [
          {
            category: "chocolate",
            dish: "ciocolata",
            sourceType: "producer_page",
            excerpt:
              "Cotlet de miel; Piept de rata; Paste cu trufe; Antricot de vita; Filet mignon; Ciocolata; Branzeturi; Desert.",
            extractionMethod: "deterministic",
            evidenceClass: "PRODUCER_EXACT",
            confidence: 70,
          },
        ],
      },
    });
    const drafts = generatePairingDrafts(item);
    expect(
      drafts.some(
        (row) =>
          row.basis.includes("producer_evidence") &&
          (row.category === "chocolate" || row.category === "dessert"),
      ),
    ).toBe(false);
    const sanitized = sanitizeCuratedBasis(
      ["producer_evidence"],
      {
        type: "red",
        producerCulinary: item.producerContent?.culinaryPairings,
        culinaryLaundryRejected: true,
        foodEvidence: item.producerContent?.foodEvidence,
      },
      "chocolate",
    );
    expect(sanitized.rejectedProducerClaim).toBe(true);
  });

  it("preview remains in memory and can warn on editorial uplift", () => {
    const item = wine({ slug: "preview-uplift" });
    const before = item.foodMatchScore;
    const impact = previewCurationImpact(item, [
      draft(),
      draft({ dish: "Mici", category: "grilled_meat" }),
      draft({ dish: "Branzeturi maturate", category: "cheese" }),
    ]);
    expect(item.foodMatchScore).toBe(before);
    expect(impact.predictedFood.level).not.toBe("strong");
    expect(impact.currentFood.confidence).toBeGreaterThan(0);
  });
});
