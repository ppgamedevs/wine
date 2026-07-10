import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";
import {
  calculateValueScore,
  VALUE_SCORE_ALGORITHM_VERSION,
  valueScoreInputFromWine,
} from "@/lib/scoring";
import { buildFeatureInputFromWine } from "@/lib/quality-model/features";
import { predictEstimatedQualitySync } from "@/lib/quality-model/predict";

export interface RecalculateValueScoresOptions {
  dryRun?: boolean;
  logPrefix?: string;
}

export interface RecalculateValueScoresReport {
  total: number;
  updated: number;
  unchanged: number;
  average: number;
  min: number;
  max: number;
  recommended: number;
  exceptional: number;
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

  const scores: number[] = [];
  let updated = 0;
  let unchanged = 0;

  for (const wine of rows) {
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
      estimatedQuality: wine.estimatedQuality,
      drinkabilityStart: wine.drinkabilityStart,
      drinkabilityEnd: wine.drinkabilityEnd,
    });

    const newScore = calculateValueScore(input);
    scores.push(newScore);

    const estimatedQuality =
      predictEstimatedQualitySync(
        buildFeatureInputFromWine({
          type: wine.type,
          vintage: wine.vintage,
          grapeVarieties: wine.grapeVarieties,
          region: wine.region,
          winery: wine.winery,
          acidity: wine.acidity,
          cellarPotential: wine.cellarPotential,
          medals: wine.medals,
        }),
      ) ?? input.baseQuality ?? 65;

    const qualityChanged =
      wine.estimatedQuality == null ||
      Math.abs(wine.estimatedQuality - (estimatedQuality ?? 65)) >= 0.1;

    if (wine.valueScore === newScore && !qualityChanged) {
      unchanged += 1;
      continue;
    }

    if (!dryRun) {
      await db
        .update(wines)
        .set({
          valueScore: newScore,
          valueScoreVersion: VALUE_SCORE_ALGORITHM_VERSION,
          estimatedQuality,
        })
        .where(eq(wines.id, wine.id));
    }

    updated += 1;
  }

  const average =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const recommended = scores.filter((score) => score >= 75).length;
  const exceptional = scores.filter((score) => score >= 90).length;

  console.log(`\n${prefix} Distributie Value Score v${VALUE_SCORE_ALGORITHM_VERSION}`);
  console.log(`  Medie:            ${average}`);
  console.log(`  Min / Max:          ${min} / ${max}`);
  console.log(`  Recomandate (75+):  ${recommended}`);
  console.log(`  Exceptionale (90+): ${exceptional}`);
  console.log(`${prefix} Actualizate: ${updated}${dryRun ? " (simulat)" : ""}, neschimbate: ${unchanged}`);

  return {
    total: rows.length,
    updated,
    unchanged,
    average,
    min,
    max,
    recommended,
    exceptional,
  };
}
