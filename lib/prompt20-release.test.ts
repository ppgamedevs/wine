import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { GOLDEN_CURATION_STATS } from "@/lib/pairing/golden-curation-dataset";
import { isPublicProducerBackedPairing } from "@/lib/pairing-curation";
import {
  getDishPairingPage,
  rankWinesForDishDetailed,
} from "@/lib/dish-pairing-pages";
import {
  dishMatchSpecificity,
  scoreWineForDish,
} from "@/lib/recommendation/dish-match";
import {
  parseOccasionMatchMode,
  setOccasionMatchModeForTests,
  usesPublicOccasionMatch,
} from "@/lib/recommendation/occasion-match-mode";
import {
  rankWinesForOccasion,
  scoreWineForOccasion,
  winePassesHardConstraints,
} from "@/lib/recommendation/occasion-match";
import {
  publicFoodScoreDisplay,
  publicGiftScoreDisplay,
} from "@/lib/scoring-v2/public-secondary-display";
import {
  parseSecondaryScoringMode,
  setSecondaryScoringModeForTests,
  usesSecondaryV2Display,
  usesSecondaryV2Ranking,
} from "@/lib/scoring-v2/secondary-scoring-mode";
import { resolveTopList } from "@/lib/top-lists";
import { buildWorthItAnalysis } from "@/lib/wine-analysis";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { id: number; slug: string },
): WineWithRelations {
  return {
    name: overrides.slug,
    type: "red",
    sweetness: "sec",
    priceAvg: 48,
    valueScore: 78,
    giftScore: 22,
    foodMatchScore: 24,
    estimatedQuality: 78,
    vintage: 2022,
    alcohol: 13,
    grapeVarieties: [{ name: "Fetească Neagră" }],
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

afterEach(() => {
  setSecondaryScoringModeForTests(null);
  setOccasionMatchModeForTests(null);
});

describe("Prompt 20 display-only release architecture", () => {
  it("fails safe to shadow and internal", () => {
    expect(parseSecondaryScoringMode(undefined)).toBe("shadow");
    expect(parseSecondaryScoringMode("invalid")).toBe("shadow");
    expect(parseOccasionMatchMode(undefined)).toBe("internal");
    expect(parseOccasionMatchMode("invalid")).toBe("internal");
  });

  it("documents independent display, ranking and Occasion behavior", () => {
    const matrix = [
      ["legacy", false, false],
      ["shadow", false, false],
      ["display", true, false],
      ["live", true, true],
    ] as const;
    for (const [mode, display, ranking] of matrix) {
      setSecondaryScoringModeForTests(mode);
      expect(usesSecondaryV2Display()).toBe(display);
      expect(usesSecondaryV2Ranking()).toBe(ranking);
      expect(usesPublicOccasionMatch()).toBe(false);
    }
  });

  it("uses v2 display without a disguised legacy fallback", () => {
    const candidate = wine({
      id: 1,
      slug: "candidate",
      giftScore: 99,
      foodMatchScore: 98,
    });
    setSecondaryScoringModeForTests("display");
    const gift = publicGiftScoreDisplay(candidate);
    const food = publicFoodScoreDisplay(candidate);
    expect(gift.score).not.toBe(99);
    expect(food.score).not.toBe(98);
    if (gift.score == null) expect(gift.caption).toBeTruthy();
    if (food.score == null) expect(food.caption).toBeTruthy();
  });

  it("keeps top-list ranking hashes identical between shadow and display", () => {
    const catalog = [
      wine({ id: 1, slug: "legacy-high", giftScore: 88, valueScore: 61 }),
      wine({ id: 2, slug: "v2-high", giftScore: 44, valueScore: 91 }),
      wine({ id: 3, slug: "middle", giftScore: 70, valueScore: 76 }),
    ];
    setSecondaryScoringModeForTests("shadow");
    const shadow = JSON.stringify(
      resolveTopList("vinuri-cadou", catalog)?.wines.map((item) => item.slug),
    );
    setSecondaryScoringModeForTests("display");
    const display = JSON.stringify(
      resolveTopList("vinuri-cadou", catalog)?.wines.map((item) => item.slug),
    );
    expect(display).toBe(shadow);
  });

  it("keeps Occasion Match off public dish pages until its separate gate is public", () => {
    const config = getDishPairingPage("sarmale");
    expect(config).not.toBeNull();
    const candidate = wine({ id: 1, slug: "candidate" });
    const dish = scoreWineForDish(candidate, config!.dishName);
    const occasion = scoreWineForOccasion(candidate, {
      occasion: config!.occasionId!,
      budgetMin: 0,
      budgetMax: config!.defaultBudget,
      budgetSpecified: true,
      budgetConstraint: "hard",
      dish: config!.dishName,
    });

    setOccasionMatchModeForTests("internal");
    expect(rankWinesForDishDetailed([candidate], config!)[0]?.score).toBe(
      dish.score,
    );

    setOccasionMatchModeForTests("public");
    expect(rankWinesForDishDetailed([candidate], config!)[0]?.score).toBe(
      occasion?.score,
    );
  });

  it("does not advertise Occasion Match on public SEO lists while the gate is internal", () => {
    const catalog = [
      wine({ id: 1, slug: "first", priceAvg: 30 }),
      wine({ id: 2, slug: "second", priceAvg: 40 }),
    ];
    setOccasionMatchModeForTests("internal");
    const internal = resolveTopList(
      "vinuri-sub-50-lei-pentru-sarmale",
      catalog,
    );
    expect(internal?.faq.map((entry) => entry.answer).join(" ")).not.toContain(
      "Occasion Match",
    );

    setSecondaryScoringModeForTests("live");
    setOccasionMatchModeForTests("public");
    const publicList = resolveTopList(
      "vinuri-sub-50-lei-pentru-sarmale",
      catalog,
    );
    expect(publicList?.faq.map((entry) => entry.answer).join(" ")).toContain(
      "Occasion Match",
    );
  });
});

describe("Prompt 20 buyer and recommendation correctness", () => {
  it("does not claim current value when price is missing", () => {
    const analysis = buildWorthItAnalysis(
      wine({ id: 1, slug: "no-price", priceAvg: null, currentPrice: null }),
    );
    expect(analysis.headline).toBe("Preț indisponibil momentan");
    expect(analysis.summary).not.toMatch(/raport excelent|la prețul actual/i);
  });

  it("excludes unknown prices from every hard budget", () => {
    expect(
      winePassesHardConstraints(
        wine({ id: 1, slug: "unknown", priceAvg: null }),
        {
          occasion: "cadou",
          budgetSpecified: true,
          budgetMax: 50,
          budgetConstraint: "hard",
        },
      ),
    ).toBe(false);
  });

  it("prefers exact canonical dishes over family and category matches", () => {
    expect(
      dishMatchSpecificity("Sarmale în foi de viță", "sarmale in foi de vita"),
    ).toBe(4);
    expect(
      dishMatchSpecificity("Sarmale clasice", "sarmale in foi de vita"),
    ).toBe(1);
    expect(dishMatchSpecificity("Păstrăv la grătar", "pastrav")).toBeGreaterThan(
      dishMatchSpecificity("Plachie de crap", "pastrav"),
    );
  });

  it("keeps generic sarmale discovery broader than an exact variant", () => {
    expect(dishMatchSpecificity("Sarmale de post", "sarmale")).toBe(2);
    expect(
      dishMatchSpecificity("Sarmale de post", "sarmale in foi de vita"),
    ).toBe(1);
  });

  it("resolves ciorbă variants canonically instead of dropping to an unknown soup", () => {
    expect(scoreWineForDish(wine({ id: 1, slug: "red" }), "Ciorbă de burtă").categoryMatched)
      .toBe(true);
    expect(
      dishMatchSpecificity("Ciorbă de burtă", "Ciorbă de burtă"),
    ).toBeGreaterThan(
      dishMatchSpecificity("Ciorbă de perișoare", "Ciorbă de burtă"),
    );
  });

  it("requires trusted sweetness or exact producer evidence for dessert", () => {
    const unresolved = scoreWineForDish(
      {
        type: "red",
        sweetness: "demidulce",
        sweetnessTrust: "conflicting",
      },
      "papanași",
    );
    const lexicalOnly = scoreWineForDish(
      {
        type: "red",
        sweetness: "sec",
        sweetnessTrust: "unknown",
        producerContent: {
          culinaryPairings: "Arome de fructe și o dulceață plăcută.",
        },
      },
      "desert",
    );
    expect(unresolved.confidence).toBeLessThan(40);
    expect(lexicalOnly.score).toBeLessThan(50);
  });

  it("keeps Prima Stilla and Dark Count out of confident dessert results", () => {
    for (const candidate of [
      wine({
        id: 1,
        slug: "budureasca-spumant-prima-stilla-rose-sec-2016",
        type: "sparkling",
        sweetness: "sec",
      }),
      wine({
        id: 2,
        slug: "budureasca-dark-count-cabernet-feteasca-neagra-demisec-2020",
        sweetness: "demisec",
      }),
    ]) {
      const result = scoreWineForOccasion(
        { ...candidate, sweetnessTrust: "conflicting" },
        { occasion: "pentru-desert" },
      );
      expect(result).toBeNull();
    }
  });

  it("never allows REVIEW_REQUIRED to reach ranked recommendations", () => {
    const ranked = rankWinesForOccasion(
      [
        wine({
          id: 1,
          slug: "conflict",
          name: "Vin Dulce",
          sweetness: "sec",
          valueScore: 99,
        }),
        wine({ id: 2, slug: "safe", valueScore: 70 }),
      ],
      { occasion: "oricare" },
    );
    expect(ranked.map((item) => item.wine.slug)).toEqual(["safe"]);
  });

  it("builds concise reasons from supported factors", () => {
    const result = scoreWineForOccasion(wine({ id: 1, slug: "safe" }), {
      occasion: "sarmale",
      budgetSpecified: true,
      budgetMax: 60,
      budgetConstraint: "hard",
    });
    expect(result).not.toBeNull();
    expect(result?.reasons.length).toBeLessThanOrEqual(3);
    expect(result?.reasons.join(" ")).not.toMatch(
      /tanin|aciditate ridicată|corp amplu|note minerale/i,
    );
  });

  it("requires current exact evidence for a public producer badge", () => {
    const pairing = {
      dish: "Tocăniță de vânat",
      category: "game",
      source: "vinintel_curated" as const,
      basis: ["producer_evidence" as const],
    };
    const broad = wine({
      id: 1,
      slug: "explicit",
      producerContent: { culinaryPairings: "Se recomandă cu vânat." },
    });
    const exact = wine({
      id: 2,
      slug: "exact",
      producerContent: {
        culinaryPairings: "Se recomandă cu Tocăniță de vânat.",
      },
    });
    expect(isPublicProducerBackedPairing(broad, pairing)).toBe(false);
    expect(isPublicProducerBackedPairing(exact, pairing)).toBe(true);
  });

  it("preserves the 30 wine and 102 pairing golden fixture", () => {
    expect(GOLDEN_CURATION_STATS.wines).toBe(30);
    expect(GOLDEN_CURATION_STATS.pairings).toBe(102);
  });

  it("keeps the public detail route server-rendered and network-free", async () => {
    const source = await readFile(
      new URL("../app/wines/[slug]/page.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain('"use client"');
  });

  it("keeps Value primary and removes it from secondary use-case cards", async () => {
    const [page, hero, buying, secondary] = await Promise.all([
      readFile(new URL("../app/wines/[slug]/page.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../components/wines/wine-hero.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../components/wines/wine-buying-decision.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../components/wines/wine-score-cards.tsx", import.meta.url),
        "utf8",
      ),
    ]);
    expect(page).toContain("<WineHero");
    expect(hero).toContain("<WineBuyingDecision");
    expect(page).not.toContain("<WineWorthIt");
    expect(page).not.toContain("<WineProsCons");
    expect(buying.match(/Value Score/g)).toHaveLength(1);
    expect(secondary).not.toMatch(/VinIntel Score|valueScore/);
  });

  it("orders the public wine page around the buying decision", async () => {
    const source = await readFile(
      new URL("../app/wines/[slug]/page.tsx", import.meta.url),
      "utf8",
    );
    const order = [
      "<WineHero",
      "<WineAvailability",
      "<WinePairings",
      "<WineScoreCards",
      "<WineRelatedSections",
      "<WineDualScores",
      "<WineSpecsTable",
      "<WineEditorial",
      "<WineFaq",
    ].map((component) => source.indexOf(component));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });
});
