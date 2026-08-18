/**
 * Prompt 19 consolidated product utility and secondary scoring release gate.
 * Read-only: computes v2 in memory and never persists scores or recommendations.
 */
import "../lib/load-env";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { normalizeWineRows } from "../lib/normalize-wine";
import {
  GOLDEN_CURATION_WINES,
} from "../lib/pairing/golden-curation-dataset";
import {
  classifyOccasionSanity,
  deltaBucket,
  distributionStats,
  giftConfidenceBand,
  giftDisplayState,
  hardBudgetCompliant,
  overlapCount,
  priceBand,
  removePairingProducerEvidence,
  spearmanCorrelation,
} from "../lib/product-release-gate";
import { assessRecommendationEligibility } from "../lib/recommendation/eligibility";
import { scoreWineForDish } from "../lib/recommendation/dish-match";
import {
  rankWinesForOccasion,
  type OccasionId,
  type OccasionMatchInput,
} from "../lib/recommendation/occasion-match";
import { wineFactEvidence, wines } from "../lib/schema";
import { resolveTopList, TOP_LIST_SLUGS } from "../lib/top-lists";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "../lib/scoring-v2/gift-score";
import {
  getSecondaryScoringMode,
  parseSecondaryScoringMode,
  setSecondaryScoringModeForTests,
} from "../lib/scoring-v2/secondary-scoring-mode";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "../lib/scoring-v2/wine-score-inputs";
import type { WineWithRelations } from "../types";

const OCCASIONS: OccasionId[] = [
  "oricare",
  "nunta",
  "cadou",
  "cadou-business",
  "cina-romantica",
  "sarmale",
  "gratar",
  "petrecere",
  "sarbatori",
  "pentru-desert",
];

const DISHES = [
  "Sarmale",
  "Sarmale în foi de viță",
  "Pastramă",
  "Mici",
  "Păstrăv",
  "Plachie de crap",
  "Ciulama de pui",
  "Ciorbă de burtă",
  "Papanași",
] as const;

const KNOWN_DISPUTED_SWEETNESS_SLUGS = new Set([
  "budureasca-spumant-prima-stilla-rose-sec-2016",
  "budureasca-dark-count-cabernet-feteasca-neagra-demisec-2020",
]);

interface Scenario {
  id: string;
  request: string;
  occasion: OccasionId;
  budgetMax?: number;
  color?: OccasionMatchInput["color"];
  sweetness?: OccasionMatchInput["sweetness"];
  dish?: string;
}

const SCENARIOS: Scenario[] = [
  { id: "red-sec-50", request: "Vreau un vin roșu sec bun sub 50 lei.", occasion: "oricare", budgetMax: 50, color: "red", sweetness: "sec" },
  { id: "sarmale", request: "Ce vin iau pentru sarmale?", occasion: "sarmale", dish: "Sarmale" },
  { id: "sarmale-70", request: "Vreau un vin pentru sarmale sub 70 lei.", occasion: "sarmale", budgetMax: 70, dish: "Sarmale" },
  { id: "gift-dinner", request: "Ce vin să duc cadou la o cină?", occasion: "cadou" },
  { id: "boss-100", request: "Cadou pentru șef, maxim 100 lei.", occasion: "cadou-business", budgetMax: 100 },
  { id: "romantic-120", request: "Vin pentru o cină romantică, maxim 120 lei.", occasion: "cina-romantica", budgetMax: 120 },
  { id: "fish", request: "Ce vin merge cu pește?", occasion: "oricare", dish: "pește" },
  { id: "grill-60", request: "Vreau ceva pentru grătar, sub 60 lei.", occasion: "gratar", budgetMax: 60, dish: "grătar" },
  { id: "beginner-50", request: "Nu mă pricep la vin. Ce cumpăr cu 50 lei?", occasion: "oricare", budgetMax: 50 },
  { id: "sparkling-party", request: "Vreau un spumant pentru petrecere.", occasion: "petrecere", color: "sparkling" },
  { id: "sweet-dessert", request: "Vreau un vin dulce pentru desert.", occasion: "pentru-desert", sweetness: "dulce", dish: "desert" },
  { id: "value-100", request: "Care este cel mai bun raport calitate-preț sub 100 lei?", occasion: "oricare", budgetMax: 100 },
];

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function median(values: number[]): number {
  return distributionStats(values).median;
}

function rankingHash(catalog: WineWithRelations[], mode: "shadow" | "display"): string {
  setSecondaryScoringModeForTests(mode);
  const rankings = TOP_LIST_SLUGS.map((slug) => ({
    slug,
    wines: resolveTopList(slug, catalog)?.wines.map((wine) => wine.slug) ?? [],
  }));
  return createHash("sha256").update(JSON.stringify(rankings)).digest("hex");
}

function pearson(left: number[], right: number[]): number | null {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index]! - leftMean;
    const rightDelta = right[index]! - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquares += leftDelta ** 2;
    rightSquares += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 1000;
}

function topSlugs<T extends { slug: string }>(rows: T[], count: number): string[] {
  return rows.slice(0, count).map((row) => row.slug);
}

function wineryConcentration<T extends { winery: string }>(rows: T[], limit: number) {
  const counts = new Map<string, number>();
  for (const row of rows.slice(0, limit)) {
    counts.set(row.winery, (counts.get(row.winery) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([winery, count]) => ({ winery, count, share: Math.round((count / limit) * 1000) / 10 }))
    .sort((left, right) => right.count - left.count || left.winery.localeCompare(right.winery));
}

function comparison(rows: Array<{ slug: string; legacy: number; v2: number }>) {
  const deltas = rows.map((row) => row.v2 - row.legacy);
  const legacyRank = [...rows].sort((left, right) => right.legacy - left.legacy || left.slug.localeCompare(right.slug));
  const v2Rank = [...rows].sort((left, right) => right.v2 - left.v2 || left.slug.localeCompare(right.slug));
  const buckets = { "0-4": 0, "5-9": 0, "10-19": 0, "20+": 0 };
  for (const delta of deltas) buckets[deltaBucket(delta)] += 1;
  return {
    meanAbsoluteDelta: average(deltas.map(Math.abs)),
    medianDelta: median(deltas),
    maxAbsoluteDelta: Math.max(...deltas.map(Math.abs)),
    spearman: spearmanCorrelation(rows.map((row) => row.legacy), rows.map((row) => row.v2)),
    top10Overlap: overlapCount(topSlugs(legacyRank, 10), topSlugs(v2Rank, 10), 10),
    top25Overlap: overlapCount(topSlugs(legacyRank, 25), topSlugs(v2Rank, 25), 25),
    deltaBuckets: buckets,
    largestDifferences: [...rows]
      .map((row) => ({ ...row, delta: row.v2 - row.legacy }))
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
      .slice(0, 30),
    legacyTop10: legacyRank.slice(0, 10),
    v2Top10: v2Rank.slice(0, 10),
  };
}

function selectRepresentativeMatrix(
  catalog: WineWithRelations[],
  giftById: Map<number, ReturnType<typeof calculateGiftScore>>,
  foodById: Map<number, ReturnType<typeof calculateFoodVersatility>>,
  evidenceByWine: Map<number, number>,
) {
  const sorted = [...catalog].sort((left, right) => (left.priceAvg ?? 9999) - (right.priceAvg ?? 9999));
  const wineryQuotas = [
    ["cramele-recas", 5],
    ["balla-geza", 5],
    ["budureasca", 5],
    ["avincis", 3],
    ["gabai", 3],
    ["murfatlar", 2],
  ] as const;
  const wineryMatrix = wineryQuotas.flatMap(([slug, count]) =>
    catalog.filter((wine) => wine.winery?.slug === slug).slice(0, count),
  );
  const candidates = [
    ...wineryMatrix,
    ...sorted.slice(0, 3),
    ...sorted.slice(-3),
    ...[...catalog].sort((left, right) => (right.valueScore ?? 0) - (left.valueScore ?? 0)).slice(0, 3),
    ...[...catalog].sort((left, right) => (left.valueScore ?? 999) - (right.valueScore ?? 999)).slice(0, 3),
    ...["red", "white", "rose", "sparkling", "orange"].flatMap((type) =>
      catalog.filter((wine) => wine.type === type).slice(0, 2),
    ),
    ...catalog.filter((wine) => wine.priceAvg == null).slice(0, 2),
    ...catalog
      .filter(
        (wine) =>
          wine.affiliateLinks.length === 0 &&
          !wine.availability.some((entry) => Boolean(entry.url)),
      )
      .slice(0, 2),
  ];
  const unique = [...new Map(candidates.map((wine) => [wine.id, wine])).values()];
  return unique.map((wine) => {
    const gift = giftById.get(wine.id)!;
    const food = foodById.get(wine.id)!;
    const hasCommercialLink =
      wine.affiliateLinks.some((row) => Boolean(row.url)) ||
      wine.availability.some((row) => Boolean(row.url));
    const answers = {
      worthIt: wine.valueScore != null,
      price: wine.priceAvg != null || wine.currentPrice != null,
      identity: Boolean(wine.type && wine.sweetness),
      food: wine.foodPairings.length > 0 || food.displayable,
      gift: giftDisplayState(gift.confidence) !== "HIDDEN",
      occasion: assessRecommendationEligibility(wine) !== "REVIEW_REQUIRED",
      alternative: true,
      trust: (evidenceByWine.get(wine.id) ?? 0) > 0,
      buy: hasCommercialLink,
    };
    return {
      slug: wine.slug,
      winery: wine.winery?.name ?? "unknown",
      type: wine.type,
      price: wine.priceAvg,
      value: wine.valueScore,
      gift: gift.score,
      giftConfidence: gift.confidence,
      food: food.score,
      foodConfidence: food.confidence,
      curated: wine.foodPairings.length,
      evidenceRows: evidenceByWine.get(wine.id) ?? 0,
      answeredIn30Seconds: Object.values(answers).filter(Boolean).length,
      possibleAnswers: Object.keys(answers).length,
      answers,
    };
  });
}

async function main() {
  if (process.argv.includes("--apply")) {
    throw new Error("product:release-gate is read-only and refuses --apply");
  }
  const productionMode = getSecondaryScoringMode();
  if (productionMode !== "shadow") {
    throw new Error(
      `Product release diagnostics require production shadow mode, got ${productionMode}`,
    );
  }
  const requestedSimulation = argValue("simulate-mode");
  const mode = requestedSimulation
    ? parseSecondaryScoringMode(requestedSimulation)
    : productionMode;
  if (mode !== "shadow" && mode !== "display") {
    throw new Error("Only shadow and display simulations are allowed");
  }
  setSecondaryScoringModeForTests(mode);
  const dbRows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(dbRows as WineWithRelations[]);
  const evidence = await db
    .select({ wineId: wineFactEvidence.wineId, field: wineFactEvidence.field })
    .from(wineFactEvidence);
  const evidenceByWine = new Map<number, number>();
  const verifiedSweetnessWineIds = new Set<number>();
  for (const row of evidence) {
    evidenceByWine.set(row.wineId, (evidenceByWine.get(row.wineId) ?? 0) + 1);
    if (row.field === "sweetness") verifiedSweetnessWineIds.add(row.wineId);
  }
  const recommendationCatalog = catalog.map((wine) => {
    const eligibility = assessRecommendationEligibility(wine);
    return {
      ...wine,
      sweetnessTrust:
        wine.sweetness == null
          ? ("unknown" as const)
          : eligibility === "REVIEW_REQUIRED" ||
              KNOWN_DISPUTED_SWEETNESS_SLUGS.has(wine.slug)
            ? ("conflicting" as const)
            : verifiedSweetnessWineIds.has(wine.id)
              ? ("verified" as const)
              : ("catalog_only" as const),
    };
  });

  const giftById = new Map(
    catalog.map((wine) => [wine.id, calculateGiftScore(giftScoreInputFromWine(wine))]),
  );
  const foodById = new Map(
    catalog.map((wine) => [wine.id, calculateFoodVersatility(foodVersatilityInputFromWine(wine))]),
  );
  const scoreRows = catalog.map((wine) => {
    const gift = giftById.get(wine.id)!;
    const food = foodById.get(wine.id)!;
    return {
      wine,
      slug: wine.slug,
      winery: wine.winery?.name ?? "unknown",
      price: wine.currentPrice ?? wine.priceAvg,
      value: wine.valueScore,
      legacyGift: wine.giftScore ?? 0,
      legacyFood: wine.foodMatchScore ?? 0,
      gift,
      food,
      eligibility: assessRecommendationEligibility(wine),
    };
  });

  const valueRows = scoreRows.filter((row): row is typeof row & { value: number } => row.value != null);
  const priceValueRows = valueRows.filter(
    (row): row is typeof row & { price: number } => row.price != null,
  );
  const valueByPriceBand = Object.fromEntries(
    [...new Set(priceValueRows.map((row) => priceBand(row.price)))].map((band) => [
      band,
      distributionStats(priceValueRows.filter((row) => priceBand(row.price) === band).map((row) => row.value)),
    ]),
  );
  const valueByWinery = Object.fromEntries(
    [...new Set(valueRows.map((row) => row.winery))].map((winery) => [
      winery,
      distributionStats(valueRows.filter((row) => row.winery === winery).map((row) => row.value)),
    ]),
  );

  const giftConfidenceBands = Object.fromEntries(
    ["<40", "40-54", "55-69", "70-84", "85+"].map((band) => {
      const rows = scoreRows.filter((row) => giftConfidenceBand(row.gift.confidence) === band);
      return [
        band,
        {
          count: rows.length,
          share: Math.round((rows.length / catalog.length) * 1000) / 10,
          score: distributionStats(rows.map((row) => row.gift.score)),
          confidence: distributionStats(rows.map((row) => row.gift.confidence)),
        },
      ];
    }),
  );
  const giftRank = [...scoreRows].sort(
    (left, right) => right.gift.score - left.gift.score || right.gift.confidence - left.gift.confidence,
  );
  const foodRank = [...scoreRows].sort(
    (left, right) => right.food.score - left.food.score || right.food.confidence - left.food.confidence,
  );

  const foodEvidenceLevels = Object.fromEntries(
    [...new Set(scoreRows.map((row) => row.food.evidenceLevel))].map((level) => {
      const count = scoreRows.filter((row) => row.food.evidenceLevel === level).length;
      return [level, { count, share: Math.round((count / catalog.length) * 1000) / 10 }];
    }),
  );
  const foodProvenance = Object.fromEntries(
    [...new Set(scoreRows.map((row) => row.food.evidenceProvenance))].map((provenance) => {
      const count = scoreRows.filter((row) => row.food.evidenceProvenance === provenance).length;
      return [provenance, { count, share: Math.round((count / catalog.length) * 1000) / 10 }];
    }),
  );

  const goldenSlugs = new Set(GOLDEN_CURATION_WINES.map((wine) => wine.slug));
  const golden = scoreRows
    .filter((row) => goldenSlugs.has(row.slug))
    .map((row) => {
      const fixture = GOLDEN_CURATION_WINES.find((wine) => wine.slug === row.slug)!;
      return {
        slug: row.slug,
        winery: row.winery,
        food: row.food.score,
        confidence: row.food.confidence,
        evidenceLevel: row.food.evidenceLevel,
        evidenceProvenance: row.food.evidenceProvenance,
        curatedPairings: fixture.pairings.length,
        pairingFamilies: [...new Set(fixture.pairings.map((pairing) => pairing.family).filter(Boolean))].length,
        producerEvidencePairings: fixture.pairings.filter((pairing) => pairing.basis.includes("producer_evidence")).length,
        technicalEvidenceRows: evidenceByWine.get(row.wine.id) ?? 0,
      };
    });

  const explicit = scoreRows.find((row) => row.slug === "cramele-recas-explicit-feteasca-neagra-2023");
  const correctedWine = explicit
    ? {
        ...explicit.wine,
        foodPairings: removePairingProducerEvidence(
          explicit.wine.foodPairings,
          "Tocăniță de vânat",
        ),
      }
    : null;
  const correctedFood = correctedWine
    ? calculateFoodVersatility(foodVersatilityInputFromWine(correctedWine))
    : null;
  const overlayOccasion = explicit
    ? rankWinesForOccasion(recommendationCatalog, { occasion: "sarbatori" }).findIndex(
        (row) => row.wine.id === explicit.wine.id,
      ) + 1
    : 0;
  const correctedCatalog = correctedWine
    ? recommendationCatalog.map((wine) =>
        wine.id === correctedWine.id ? { ...correctedWine, sweetnessTrust: wine.sweetnessTrust } : wine,
      )
    : recommendationCatalog;
  const correctedOverlayOccasion = explicit
    ? rankWinesForOccasion(correctedCatalog, { occasion: "sarbatori" }).findIndex(
        (row) => row.wine.id === explicit.wine.id,
      ) + 1
    : 0;

  const occasionLists = OCCASIONS.map((occasion) => {
    const ranked = rankWinesForOccasion(recommendationCatalog, { occasion }).slice(0, 10);
    return {
      occasion,
      rows: ranked.map((row, index) => {
        const wine = row.wine as WineWithRelations;
        const gift = giftById.get(wine.id)!;
        const food = foodById.get(wine.id)!;
        return {
          rank: index + 1,
          slug: wine.slug,
          winery: wine.winery?.name ?? "unknown",
          price: wine.priceAvg,
          value: wine.valueScore,
          gift: gift.score,
          giftConfidence: gift.confidence,
          food: food.score,
          foodConfidence: food.confidence,
          occasionScore: row.score,
          occasionConfidence: row.confidence,
          eligibility: row.eligibility,
          status: row.status,
          reasons: row.reasons,
          sanity: classifyOccasionSanity({
            occasion,
            type: wine.type,
            sweetness: wine.sweetness,
            confidence: row.confidence,
            eligibility: row.eligibility,
            price: wine.priceAvg,
          }),
        };
      }),
    };
  });
  const sanityCounts = occasionLists
    .flatMap((list) => list.rows)
    .reduce<Record<string, number>>((counts, row) => {
      counts[row.sanity] = (counts[row.sanity] ?? 0) + 1;
      return counts;
    }, {});

  const budgetCases = [
    ["cadou", 50], ["cadou", 100], ["cadou", 150],
    ["cina-romantica", 75], ["cina-romantica", 150],
    ["gratar", 50], ["gratar", 80],
    ["sarmale", 50], ["sarmale", 100],
  ] as Array<[OccasionId, number]>;
  const budgetSensitivity = budgetCases.map(([occasion, budgetMax]) => {
    const rows = rankWinesForOccasion(recommendationCatalog, {
      occasion,
      budgetMax,
      budgetSpecified: true,
      budgetConstraint: "hard",
    }).slice(0, 5);
    return {
      occasion,
      budgetMax,
      compliant: rows.every((row) => hardBudgetCompliant(row.wine.priceAvg, budgetMax)),
      rows: rows.map((row) => ({ slug: row.wine.slug, price: row.wine.priceAvg, score: row.score })),
    };
  });

  const scenarios = SCENARIOS.map((scenario) => {
    let rows = rankWinesForOccasion(recommendationCatalog, {
      occasion: scenario.occasion,
      ...(scenario.budgetMax != null
        ? { budgetMax: scenario.budgetMax, budgetSpecified: true, budgetConstraint: "hard" as const }
        : {}),
      ...(scenario.color ? { color: scenario.color } : {}),
      ...(scenario.sweetness ? { sweetness: scenario.sweetness } : {}),
      ...(scenario.dish ? { dish: scenario.dish } : {}),
    });
    if (scenario.id === "fish") {
      rows = recommendationCatalog
        .map((wine) => {
          const dish = scoreWineForDish(wine, "pește");
          return {
            wine,
            score: dish.score,
            confidence: dish.confidence,
            eligibility: assessRecommendationEligibility(wine),
            reasons: dish.reasons,
          };
        })
        .filter((row) => row.eligibility !== "REVIEW_REQUIRED")
        .sort((left, right) => right.score - left.score || right.confidence - left.confidence) as typeof rows;
    }
    const top = rows.slice(0, 5).map((row) => {
      const constraintViolations: string[] = [];
      if (
        scenario.budgetMax != null &&
        !hardBudgetCompliant(row.wine.priceAvg, scenario.budgetMax)
      ) {
        constraintViolations.push("BUDGET");
      }
      if (
        scenario.color &&
        scenario.color !== "any" &&
        row.wine.type !== scenario.color
      ) {
        constraintViolations.push("COLOR");
      }
      if (
        scenario.sweetness &&
        scenario.sweetness !== "any" &&
        row.wine.sweetness !== scenario.sweetness
      ) {
        constraintViolations.push("SWEETNESS");
      }
      if (row.eligibility === "REVIEW_REQUIRED") {
        constraintViolations.push("IDENTITY_REVIEW");
      }
      const rationaleQuality =
        row.reasons.length > 0 &&
        row.reasons.length <= 3 &&
        !row.reasons.some((reason) =>
          /tanin|aciditate ridicată|corp amplu|note minerale/i.test(reason),
        );
      return {
        slug: row.wine.slug,
        winery: row.wine.winery?.name ?? "unknown",
        price: row.wine.priceAvg,
        type: row.wine.type,
        sweetness: row.wine.sweetness,
        score: row.score,
        confidence: row.confidence,
        eligibility: row.eligibility,
        status: row.status,
        reasons: row.reasons,
        constraintViolations,
        rationaleQuality,
        identitySafe: row.eligibility !== "REVIEW_REQUIRED",
        compliant: constraintViolations.length === 0,
      };
    });
    const failures = top.filter((row) => !row.compliant || row.eligibility === "REVIEW_REQUIRED").length;
    return {
      ...scenario,
      result: failures > 0 ? "FAIL" : top.some((row) => row.confidence < 50) ? "WEAK" : "PASS",
      failureReasons: [
        ...new Set(top.flatMap((row) => row.constraintViolations)),
      ],
      rows: top,
    };
  });

  const dishMatches = DISHES.map((dish) => ({
    dish,
    rows: recommendationCatalog
      .map((wine) => ({
        slug: wine.slug,
        winery: wine.winery?.name ?? "unknown",
        type: wine.type,
        sweetness: wine.sweetness,
        eligibility: assessRecommendationEligibility(wine),
        ...scoreWineForDish(wine, dish),
      }))
      .filter((row) => row.eligibility !== "REVIEW_REQUIRED")
      .sort((left, right) => right.score - left.score || right.confidence - left.confidence)
      .slice(0, 10),
  }));

  const wineryShare = Object.fromEntries(
    [...new Set(scoreRows.map((row) => row.winery))].map((winery) => [
      winery,
      {
        catalogCount: scoreRows.filter((row) => row.winery === winery).length,
        catalogShare:
          Math.round(
            (scoreRows.filter((row) => row.winery === winery).length / catalog.length) * 1000,
          ) / 10,
        giftConfidence: distributionStats(
          scoreRows.filter((row) => row.winery === winery).map((row) => row.gift.confidence),
        ),
        foodConfidence: distributionStats(
          scoreRows.filter((row) => row.winery === winery).map((row) => row.food.confidence),
        ),
      },
    ]),
  );

  const availability = {
    winesWithAvailabilityRows: catalog.filter((wine) => wine.availability.length > 0).length,
    winesWithUsableCommercialLinks: catalog.filter(
      (wine) =>
        wine.affiliateLinks.some((row) => Boolean(row.url)) ||
        wine.availability.some((row) => Boolean(row.url)),
    ).length,
    priceButNoCommercialLink: catalog.filter(
      (wine) =>
        (wine.priceAvg != null || wine.currentPrice != null) &&
        !wine.affiliateLinks.some((row) => Boolean(row.url)) &&
        !wine.availability.some((row) => Boolean(row.url)),
    ).length,
    noPrice: catalog.filter((wine) => wine.priceAvg == null && wine.currentPrice == null).length,
  };

  const appearanceByWine = new Map<string, number>();
  const appearanceByWinery = new Map<string, number>();
  for (const row of occasionLists.flatMap((list) => list.rows)) {
    appearanceByWine.set(row.slug, (appearanceByWine.get(row.slug) ?? 0) + 1);
    appearanceByWinery.set(row.winery, (appearanceByWinery.get(row.winery) ?? 0) + 1);
  }

  const snapshot = scoreRows.map((row) => ({
    slug: row.slug,
    price: row.price,
    value: row.value,
    giftV2: row.gift.score,
    giftConfidence: row.gift.confidence,
    foodV2: row.food.score,
    foodConfidence: row.food.confidence,
    foodEvidenceLevel: row.food.evidenceLevel,
    recommendationEligibility: row.eligibility,
  }));

  const shadowRankingHash = rankingHash(catalog, "shadow");
  const displayRankingHash = rankingHash(catalog, "display");
  setSecondaryScoringModeForTests(mode);

  const report = {
    prompt: "19+20",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    productionSecondaryScoringMode: productionMode,
    secondaryScoringMode: mode,
    rankingModeComparison: {
      shadowHash: shadowRankingHash,
      displayHash: displayRankingHash,
      identical: shadowRankingHash === displayRankingHash,
    },
    catalog: { verified: catalog.length, evidenceRows: evidence.length },
    value: {
      distribution: distributionStats(valueRows.map((row) => row.value)),
      byPriceBand: valueByPriceBand,
      byWinery: valueByWinery,
      priceCorrelation: pearson(priceValueRows.map((row) => row.price), priceValueRows.map((row) => row.value)),
      top20WineryConcentration: wineryConcentration(
        [...valueRows].sort((left, right) => right.value - left.value),
        20,
      ),
    },
    gift: {
      scoreDistribution: distributionStats(scoreRows.map((row) => row.gift.score)),
      confidenceDistribution: distributionStats(scoreRows.map((row) => row.gift.confidence)),
      confidenceBands: giftConfidenceBands,
      display: {
        hidden: scoreRows.filter((row) => giftDisplayState(row.gift.confidence) === "HIDDEN").length,
        limited: scoreRows.filter((row) => giftDisplayState(row.gift.confidence) === "LIMITED").length,
        normal: scoreRows.filter((row) => giftDisplayState(row.gift.confidence) === "NORMAL").length,
      },
      legacyComparison: comparison(
        scoreRows.map((row) => ({ slug: row.slug, legacy: row.legacyGift, v2: row.gift.score })),
      ),
      priceCorrelation: pearson(
        scoreRows.filter((row) => row.price != null).map((row) => row.price!),
        scoreRows.filter((row) => row.price != null).map((row) => row.gift.score),
      ),
      valueCorrelation: pearson(
        scoreRows.filter((row) => row.value != null).map((row) => row.value!),
        scoreRows.filter((row) => row.value != null).map((row) => row.gift.score),
      ),
      top20: giftRank.slice(0, 20).map((row) => ({
        slug: row.slug,
        winery: row.winery,
        price: row.price,
        score: row.gift.score,
        confidence: row.gift.confidence,
        value: row.value,
        breakdown: row.gift.breakdown,
      })),
      bottom20: giftRank.slice(-20).reverse().map((row) => ({
        slug: row.slug,
        winery: row.winery,
        price: row.price,
        score: row.gift.score,
        confidence: row.gift.confidence,
      })),
      byBudget: Object.fromEntries(
        [
          ["under50", (price: number) => price < 50],
          ["50to100", (price: number) => price >= 50 && price <= 100],
          ["over100", (price: number) => price > 100],
        ].map(([label, predicate]) => [
          label,
          giftRank
            .filter((row) => row.price != null && (predicate as (price: number) => boolean)(row.price))
            .slice(0, 10)
            .map((row) => ({ slug: row.slug, price: row.price, score: row.gift.score, confidence: row.gift.confidence })),
        ]),
      ),
    },
    food: {
      scoreDistribution: distributionStats(scoreRows.map((row) => row.food.score)),
      confidenceDistribution: distributionStats(scoreRows.map((row) => row.food.confidence)),
      displayable: scoreRows.filter((row) => row.food.displayable && row.food.evidenceLevel !== "style_only" && row.food.evidenceLevel !== "insufficient").length,
      hidden: scoreRows.filter((row) => !row.food.displayable || row.food.evidenceLevel === "style_only" || row.food.evidenceLevel === "insufficient").length,
      evidenceLevels: foodEvidenceLevels,
      provenance: foodProvenance,
      legacyComparison: comparison(
        scoreRows.map((row) => ({ slug: row.slug, legacy: row.legacyFood, v2: row.food.score })),
      ),
      topConcentration: {
        top10: wineryConcentration(foodRank, 10),
        top25: wineryConcentration(foodRank, 25),
        top50: wineryConcentration(foodRank, 50),
      },
      top50: foodRank.slice(0, 50).map((row) => ({
        slug: row.slug,
        winery: row.winery,
        score: row.food.score,
        confidence: row.food.confidence,
        evidenceLevel: row.food.evidenceLevel,
        categories: row.food.categories,
        pairings: row.wine.foodPairings.map((pairing) => pairing.dish),
      })),
      golden,
    },
    correctedProvenanceOverlay: explicit
      ? {
          slug: explicit.slug,
          currentFood: explicit.food,
          correctedFood,
          currentHolidayRank: overlayOccasion,
          correctedHolidayRank: correctedOverlayOccasion,
          persistedPairingsChanged: false,
        }
      : null,
    occasion: {
      lists: occasionLists,
      sanityCounts,
      uniqueWines: appearanceByWine.size,
      uniqueWineries: appearanceByWinery.size,
      repeatedWines: [...appearanceByWine.entries()].sort((left, right) => right[1] - left[1]).slice(0, 20),
      repeatedWineries: [...appearanceByWinery.entries()].sort((left, right) => right[1] - left[1]),
      budgetSensitivity,
    },
    scenarios,
    dishMatches,
    recommendationEligibility: {
      counts: Object.fromEntries(
        ["ELIGIBLE", "ELIGIBLE_LOW_CONFIDENCE", "REVIEW_REQUIRED"].map((status) => [
          status,
          scoreRows.filter((row) => row.eligibility === status).length,
        ]),
      ),
      nonVintage: scoreRows
        .filter((row) => row.wine.vintage == null)
        .map((row) => ({ slug: row.slug, type: row.wine.type, eligibility: row.eligibility })),
      disputedSweetness: scoreRows
        .filter((row) => row.slug.includes("prima-stilla-rose-sec-2016") || row.slug.includes("dark-count-cabernet-feteasca-neagra-demisec-2020"))
        .map((row) => ({
          slug: row.slug,
          sweetness: row.wine.sweetness,
          eligibility: row.eligibility,
          dessertRank:
            rankWinesForOccasion(recommendationCatalog, { occasion: "pentru-desert" }).findIndex(
              (candidate) => candidate.wine.id === row.wine.id,
            ) + 1,
        })),
      catalogOnlySweetness: scoreRows
        .filter((row) => row.wine.sweetness != null && !verifiedSweetnessWineIds.has(row.wine.id))
        .map((row) => ({
          slug: row.slug,
          sweetness: row.wine.sweetness,
          eligibility: row.eligibility,
          dessertRank:
            rankWinesForOccasion(recommendationCatalog, { occasion: "pentru-desert" }).findIndex(
              (candidate) => candidate.wine.id === row.wine.id,
            ) + 1,
        })),
    },
    wineryConfidence: wineryShare,
    availability,
    representativePages: selectRepresentativeMatrix(
      catalog,
      giftById,
      foodById,
      evidenceByWine,
    ),
    topListImpact: {
      gift: {
        legacyTop10: comparison(scoreRows.map((row) => ({ slug: row.slug, legacy: row.legacyGift, v2: row.gift.score }))).legacyTop10,
        v2Top10: comparison(scoreRows.map((row) => ({ slug: row.slug, legacy: row.legacyGift, v2: row.gift.score }))).v2Top10,
      },
      food: {
        legacyTop10: comparison(scoreRows.map((row) => ({ slug: row.slug, legacy: row.legacyFood, v2: row.food.score }))).legacyTop10,
        v2Top10: comparison(scoreRows.map((row) => ({ slug: row.slug, legacy: row.legacyFood, v2: row.food.score }))).v2Top10,
      },
    },
    releaseSnapshot: snapshot,
    productionWrites: {
      value: 0,
      gift: 0,
      food: 0,
      pairings: 0,
      technical: 0,
      evidence: 0,
      editorial: 0,
      urlsSlugsStatuses: 0,
    },
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  const output = argValue("output");
  if (output) await writeFile(output, json, "utf8");
  const markdownOutput = argValue("markdown");
  if (markdownOutput) {
    const pass = scenarios.filter((row) => row.result === "PASS").length;
    const weak = scenarios.filter((row) => row.result === "WEAK").length;
    const fail = scenarios.filter((row) => row.result === "FAIL").length;
    const markdown = [
      "# VinIntel Prompt 19/20 Product Release Gate",
      "",
      `Generated: ${report.generatedAt}`,
      `Production mode: ${productionMode}`,
      `Simulated mode: ${mode}`,
      "",
      "## Headline metrics",
      "",
      `- Value median: ${report.value.distribution.median}`,
      `- Gift display: ${report.gift.display.normal} normal, ${report.gift.display.limited} limited, ${report.gift.display.hidden} hidden`,
      `- Food displayable: ${report.food.displayable}/${catalog.length}`,
      `- Occasion sanity: ${JSON.stringify(sanityCounts)}`,
      `- Buyer scenarios: ${pass} PASS, ${weak} WEAK, ${fail} FAIL`,
      `- Availability: ${availability.winesWithUsableCommercialLinks}/${catalog.length} with usable commercial links`,
      `- Shadow/display ranking hashes identical: ${report.rankingModeComparison.identical}`,
      "",
      "Full row-level data is in the JSON artifact.",
      "",
    ].join("\n");
    await writeFile(markdownOutput, markdown, "utf8");
  }
  console.log(json);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
