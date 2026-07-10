import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";
import {
  buildValueScoreBreakdown,
  VALUE_SCORE_ALGORITHM_VERSION,
  valueScoreInputFromWine,
} from "@/lib/scoring";
import {
  buildExpectedQualityCurvesFromCatalog,
  buildModelQuality,
  buildPeerQualityPriors,
  peerPriorSampleFromExpected,
} from "@/lib/scoring-v2";

export interface RecalculateValueScoresOptions {
  dryRun?: boolean;
  logPrefix?: string;
}

export interface RecalculateValueScoresReport {
  total: number;
  updated: number;
  unchanged: number;
  average: number;
  median: number;
  min: number;
  max: number;
  recommended: number;
  exceptional: number;
  atCeiling: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export async function recalculateAllValueScores(
  options: RecalculateValueScoresOptions = {},
): Promise<RecalculateValueScoresReport> {
  const dryRun = options.dryRun ?? false;
  const prefix = options.logPrefix ?? "[recalculate-scores]";

  const rows = await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      valueScore: true,
      priceAvg: true,
      currentPrice: true,
      grapeVarieties: true,
      medals: true,
      type: true,
      cellarPotential: true,
      acidity: true,
      tasteProfile: true,
      vintage: true,
      ratingAvg: true,
      communityScore: true,
      criticScore: true,
      estimatedQuality: true,
      drinkabilityStart: true,
      drinkabilityEnd: true,
    },
    with: {
      region: { columns: { name: true } },
      winery: { columns: { name: true } },
    },
  });

  const passOneSamples = rows.map((wine) => {
    const input = valueScoreInputFromWine({
      priceAvg: wine.priceAvg,
      currentPrice: wine.currentPrice,
      grapeVarieties: wine.grapeVarieties,
      region: wine.region,
      medals: wine.medals,
      winery: wine.winery,
      type: wine.type,
      cellarPotential: wine.cellarPotential,
      acidity: wine.acidity,
      tasteProfile: wine.tasteProfile,
      vintage: wine.vintage,
      ratingAvg: wine.ratingAvg,
      communityScore: wine.communityScore,
      criticScore: wine.criticScore,
      drinkabilityStart: wine.drinkabilityStart,
      drinkabilityEnd: wine.drinkabilityEnd,
    });

    const { modelQuality } = buildModelQuality(input);
    const price = input.price;

    return {
      wine,
      input,
      modelQuality,
      expectedSample: {
        price,
        wineType: input.wineType,
        modelQuality,
      },
      peerSample: peerPriorSampleFromExpected({
        price,
        wineType: input.wineType,
        modelQuality,
      }),
    };
  });

  const expectedCurves = buildExpectedQualityCurvesFromCatalog(
    passOneSamples.map((entry) => entry.expectedSample),
  );
  const peerPriors = buildPeerQualityPriors(
    passOneSamples.map((entry) => entry.peerSample),
  );
  const batchContext = { peerPriors, expectedCurves };

  const scores: number[] = [];
  let updated = 0;
  let unchanged = 0;
  let atCeiling = 0;

  for (const entry of passOneSamples) {
    const { wine, input } = entry;
    const breakdown = buildValueScoreBreakdown(input, batchContext);
    const resolvedQuality = breakdown.quality ?? entry.modelQuality;

    scores.push(breakdown.finalScore);
    if (breakdown.finalScore >= 95) atCeiling += 1;

    const qualityChanged =
      wine.estimatedQuality == null ||
      Math.abs(wine.estimatedQuality - resolvedQuality) >= 0.1;

    if (wine.valueScore === breakdown.finalScore && !qualityChanged) {
      unchanged += 1;
      continue;
    }

    if (!dryRun) {
      await db
        .update(wines)
        .set({
          valueScore: breakdown.finalScore,
          valueScoreVersion: VALUE_SCORE_ALGORITHM_VERSION,
          estimatedQuality: resolvedQuality,
        })
        .where(eq(wines.id, wine.id));
    }

    updated += 1;
  }

  const average =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
        10
      : 0;
  const medianScore = Math.round(median(scores) * 10) / 10;
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const recommended = scores.filter((score) => score >= 75).length;
  const exceptional = scores.filter((score) => score >= 90).length;

  console.log(
    `\n${prefix} Distributie Value Score v${VALUE_SCORE_ALGORITHM_VERSION}`,
  );
  console.log(`  Medie:              ${average}`);
  console.log(`  Mediana:            ${medianScore}`);
  console.log(`  Min / Max:          ${min} / ${max}`);
  console.log(`  Recomandate (75+):  ${recommended}`);
  console.log(`  Exceptionale (90+): ${exceptional}`);
  console.log(`  Lipite de plafon (95+): ${atCeiling}`);
  console.log(
    `${prefix} Actualizate: ${updated}${dryRun ? " (simulat)" : ""}, neschimbate: ${unchanged}`,
  );

  return {
    total: rows.length,
    updated,
    unchanged,
    average,
    median: medianScore,
    min,
    max,
    recommended,
    exceptional,
    atCeiling,
  };
}
