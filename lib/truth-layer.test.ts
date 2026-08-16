import { describe, expect, it } from "vitest";
import { wineEditorialSchema } from "@/lib/ai/schemas";
import {
  TRUTH_ISSUE_CODES,
  validateEditorialClaims,
} from "@/lib/editorial-claim-validator";
import { evaluatePublicationGate } from "@/lib/publication-integrity";
import { planDeterministicRepairs } from "@/lib/catalog-cleanup";
import {
  buildModelQuality,
  calculateVinIntelScore,
  heuristicQualityWithoutPrice,
} from "@/lib/scoring-v2";
import type { WineScanInput } from "@/lib/integrity-scan";

const WHITE_DRY = {
  type: "white",
  sweetness: "sec",
  grapeVarieties: ["Sauvignon Blanc"],
  regionName: "Tarnave",
};

describe("Test A: white + dry + no tasting evidence", () => {
  it("rejects wine-specific tannin, red fruit, oak and forced pairing notes", () => {
    const issues = validateEditorialClaims(
      {
        descriptionEditorial:
          "Acest vin are taninurile care echilibreaza grasimea. Fructele rosii completeaza gratarul. Note de barrique.",
        tasteProfile: "elegant, complex, mineral si persistent",
        foodPairingNotes: [
          {
            dish: "Sarmale",
            note: "Taninurile echilibreaza grasimea, iar fructele rosii completeaza gratarul.",
            score: 88,
          },
          {
            dish: "Mititei",
            note: "Structura de vin rosu merge cu carnea.",
            score: 86,
          },
        ],
      },
      WHITE_DRY,
    );

    const codes = new Set(issues.map((issue) => issue.code));
    expect(codes.has(TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM)).toBe(true);
    expect(codes.has(TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM)).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_SENSORY_CLAIM &&
          issue.message.includes("fructe rosii"),
      ),
    ).toBe(true);
    expect(codes.has(TRUTH_ISSUE_CODES.EDITORIAL_PAIRING_UNSUPPORTED)).toBe(true);
    expect(issues.some((issue) => issue.blocksPublication)).toBe(true);
  });
});

describe("Test B: white wine + producer oak evidence", () => {
  it("allows an attributable oak claim when the producer mentions oak", () => {
    const issues = validateEditorialClaims(
      {
        descriptionEditorial:
          "Producatorul descrie note de stejar si vanilie din barrique.",
        tasteProfile: "stejar fin, vanilie",
      },
      {
        ...WHITE_DRY,
        tastingNotes: "Note de stejar si vanilie, fermentat in barrique.",
        producerContent: {
          tastingNotes: "Maturat 6 luni in barrique de stejar.",
        },
      },
    );

    expect(
      issues.some((issue) => issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM),
    ).toBe(false);
  });
});

describe("Test C: red wine + no tannin evidence", () => {
  it("allows labelled general guidance but not a bottle-specific strong tannin claim", () => {
    const general = validateEditorialClaims(
      {
        descriptionEditorial:
          "Vinurile rosii in general au taninuri care pot echilibra carnea grasa.",
      },
      { type: "red", sweetness: "sec", grapeVarieties: ["Feteasca Neagra"] },
    );
    expect(
      general.some((issue) => issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM),
    ).toBe(false);

    const specific = validateEditorialClaims(
      {
        descriptionEditorial: "Acest vin are taninuri ferme si o structura robusta.",
        tasteProfile: "taninuri ferme",
      },
      { type: "red", sweetness: "sec", grapeVarieties: ["Feteasca Neagra"] },
    );
    expect(
      specific.some((issue) => issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM),
    ).toBe(true);
  });
});

describe("Test D: sweet wine must not be called dry", () => {
  it("flags a sweet wine described as dry", () => {
    const issues = validateEditorialClaims(
      { descriptionEditorial: "Un vin sec, cu final lung." },
      { type: "white", sweetness: "dulce", grapeVarieties: ["Tamaioasa Romaneasca"] },
    );
    expect(
      issues.some(
        (issue) =>
          issue.code === TRUTH_ISSUE_CODES.SWEETNESS_EDITORIAL_CONTRADICTION,
      ),
    ).toBe(true);
  });
});

describe("Test E: insufficient data may stay incomplete", () => {
  it("accepts empty editorial and does not force pairings or taste profile", () => {
    const parsed = wineEditorialSchema.parse({
      descriptionEditorial: "",
      valueExplanation: "",
      thingsYouShouldKnow: [],
      tasteProfile: "",
      foodPairingNotes: [],
      dessertPairings: [],
      recommendedOccasions: [],
      valueScore: 70,
      giftScore: 70,
      foodMatchScore: 70,
    });
    expect(parsed.foodPairingNotes).toEqual([]);
    expect(parsed.tasteProfile).toBe("");

    const issues = validateEditorialClaims(
      {
        descriptionEditorial: "Vin din catalog, date de degustare insuficiente.",
        tasteProfile: "",
        foodPairingNotes: [],
      },
      { type: "white", sweetness: "sec", grapeVarieties: ["Sauvignon Blanc"] },
    );
    expect(issues.filter((issue) => issue.blocksPublication)).toHaveLength(0);
  });
});

describe("Test F: AI quality adjectives do not change Value Score", () => {
  const facts = {
    price: 60,
    wineType: "red",
    grapeVarieties: ["Feteasca Neagra"],
    region: "Dealu Mare",
    wineryName: "Crama Test",
  };

  it("does not change heuristic Q when prose goes from simplu to elegant/complex", () => {
    const simple = heuristicQualityWithoutPrice({
      ...facts,
      tasteProfile: "simplu",
    });
    const ornate = heuristicQualityWithoutPrice({
      ...facts,
      tasteProfile: "elegant, complex, mineral si persistent",
    });
    expect(ornate).toBe(simple);
  });

  it("does not change Value Score merely because those words were generated", () => {
    const simple = calculateVinIntelScore({
      ...facts,
      tasteProfile: "simplu",
    });
    const ornate = calculateVinIntelScore({
      ...facts,
      tasteProfile: "elegant, complex, mineral si persistent",
    });
    expect(ornate.valueScore).toBe(simple.valueScore);
    expect(ornate.quality).toBe(simple.quality);
  });
});

describe("unverified cellar potential does not raise quality", () => {
  it("ignores an algorithmic cellar estimate when provenance is not verified", () => {
    const low = buildModelQuality({
      wineType: "red",
      grapeVarieties: ["Feteasca Neagra"],
      region: "Dealu Mare",
      wineryName: "Crama Test",
      vintage: 2020,
      cellarPotential: 2,
    });
    const high = buildModelQuality({
      wineType: "red",
      grapeVarieties: ["Feteasca Neagra"],
      region: "Dealu Mare",
      wineryName: "Crama Test",
      vintage: 2020,
      cellarPotential: 8,
    });
    expect(high.modelQuality).toBe(low.modelQuality);
  });

  it("still uses verified factual inputs such as medals", () => {
    const bare = buildModelQuality({
      wineType: "red",
      grapeVarieties: ["Feteasca Neagra"],
      region: "Dealu Mare",
    });
    const withMedal = buildModelQuality({
      wineType: "red",
      grapeVarieties: ["Feteasca Neagra"],
      region: "Dealu Mare",
      wineMedals: [{ competition: "Concurs", medal: "gold" }],
    });
    expect(withMedal.modelQuality).toBeGreaterThanOrEqual(bare.modelQuality);
  });
});

describe("Test G: approval gate keeps blocking wines pending", () => {
  it("refuses publication and returns actionable issue codes", () => {
    const gate = evaluatePublicationGate([
      {
        wineId: 1,
        slug: "test-alb",
        severity: "high",
        code: TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM,
        message: "Afirmatie de taninuri incompatibile cu tipul vinului.",
        blocksPublication: true,
      },
    ]);
    expect(gate.ok).toBe(false);
    expect(gate.blocking[0].code).toBe(TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM);
  });

  it("allows incomplete but honest wines", () => {
    const gate = evaluatePublicationGate([
      {
        wineId: 2,
        slug: "test-incomplet",
        severity: "medium",
        code: "missing_editorial_content",
        message: "Vin publicat fara descriere editoriala.",
        blocksPublication: false,
      },
    ]);
    expect(gate.ok).toBe(true);
  });
});

describe("deterministic catalog repair", () => {
  it("clears unsafe white-wine pairing notes without inventing replacements", () => {
    const wine: WineScanInput = {
      id: 9,
      slug: "alb-test",
      name: "Alb Test",
      wineryId: 1,
      wineryName: "Crama Test",
      regionId: 1,
      regionName: "Tarnave",
      type: "white",
      sweetness: "sec",
      vintage: 2023,
      grapeVarieties: [{ name: "Sauvignon Blanc" }],
      priceAvg: 45,
      currentPrice: 45,
      priceHistory: [],
      valueScore: 70,
      criticScore: null,
      ratingAvg: null,
      communityScore: null,
      medals: [],
      status: "verified",
      sourceUrl: "https://example.com",
      affiliateLinks: [],
      descriptionEditorial:
        "Acest vin are taninurile care echilibreaza grasimea. Potrivit pentru vara.",
      tasteProfile: "taninuri ferme, barrique",
      foodPairingNotes: [
        { dish: "Sarmale", note: "Taninurile echilibreaza grasimea." },
      ],
      foodPairings: [],
      updatedAt: "2026-07-01T00:00:00.000Z",
    };

    const { next, actions } = planDeterministicRepairs(wine, [
      {
        wineId: 9,
        slug: "alb-test",
        severity: "high",
        code: TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM,
        message: "tanin",
        blocksPublication: true,
      },
      {
        wineId: 9,
        slug: "alb-test",
        severity: "high",
        code: TRUTH_ISSUE_CODES.EDITORIAL_PAIRING_UNSUPPORTED,
        message: "pairing",
        blocksPublication: true,
      },
    ]);

    expect(next.foodPairingNotes).toEqual([]);
    expect(next.tasteProfile).toBeNull();
    expect(next.descriptionEditorial).not.toContain("tanin");
    expect(actions.length).toBeGreaterThan(0);
    expect(next.slug).toBeUndefined();
  });
});
