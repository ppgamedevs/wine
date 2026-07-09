import type { WineMedal } from "@/lib/schema";
import {
  CRITIC_BLEND_CRITIC,
  CRITIC_BLEND_LOCAL,
  CRITIC_MIN_VALID,
  FINAL_SCORE_MAX,
  FINAL_SCORE_MIN,
  VALUE_SCORE_VERSION,
} from "@/lib/scoring-v2/constants";
import { calculateQualityModifiers } from "@/lib/scoring-v2/modifiers";
import {
  bucketPercentileNormalizeScores,
  calculateQualitySurplus,
  clampRawSigmoidScore,
  sigmoidValueScore,
} from "@/lib/scoring-v2/percentile";
import {
  calculateDrinkabilityPenalty,
  estimateIntrinsicQuality,
  inferDrinkabilityWindow,
} from "@/lib/scoring-v2/quality-estimate";

export interface ValueScoreV2Input {
  price: number;
  grapeVarieties?: string[];
  region?: string;
  wineryName?: string;
  wineType?: string;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
  wineMedals?: WineMedal[];
  criticScore?: number;
  vintage?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
  estimatedQuality?: number | null;
  referenceYear?: number;
}

export interface ValueScoreV2BreakdownItem {
  label: string;
  detail: string;
  points: number;
}

export interface ValueScoreV2CoreResult {
  version: typeof VALUE_SCORE_VERSION;
  qHat: number;
  qEffective: number;
  qFinal: number;
  qualitySurplus: number;
  rawSigmoidScore: number;
  drinkabilityPenalty: number;
  drinkabilityStart: number | null;
  drinkabilityEnd: number | null;
  items: ValueScoreV2BreakdownItem[];
}

export interface ValueScoreV2Result extends ValueScoreV2CoreResult {
  finalScore: number;
  percentileApplied: boolean;
}

export function buildValueScoreV2Core(
  input: ValueScoreV2Input,
): ValueScoreV2CoreResult {
  const items: ValueScoreV2BreakdownItem[] = [];

  const qHat = estimateIntrinsicQuality({
    grapeVarieties: input.grapeVarieties,
    region: input.region,
    wineryName: input.wineryName,
    wineType: input.wineType,
    cellarPotential: input.cellarPotential,
    acidity: input.acidity,
    tasteProfile: input.tasteProfile,
    vintage: input.vintage,
    ratingAvg: input.ratingAvg,
    communityScore: input.communityScore,
    estimatedQuality: input.estimatedQuality,
    referenceYear: input.referenceYear,
  });

  items.push({
    label: "Q estimat (calitate intrinseca)",
    detail: "Prior Bayesian / ML, independent de pret",
    points: qHat,
  });

  const modifiers = calculateQualityModifiers({
    qHat,
    grapeVarieties: input.grapeVarieties,
    region: input.region,
    wineryName: input.wineryName,
    wineType: input.wineType,
    cellarPotential: input.cellarPotential,
    acidity: input.acidity,
    tasteProfile: input.tasteProfile,
    wineMedals: input.wineMedals,
  });

  items.push(...modifiers.items);

  const qEffective = Math.round((qHat + modifiers.total) * 10) / 10;
  items.push({
    label: "Q efectiv (Q + M1..M5)",
    detail: `Q̂ ${qHat} + ${modifiers.total}`,
    points: qEffective,
  });

  let qFinal = qEffective;

  if (
    input.criticScore != null &&
    Number.isFinite(input.criticScore) &&
    input.criticScore >= CRITIC_MIN_VALID
  ) {
    qFinal =
      Math.round(
        (CRITIC_BLEND_CRITIC * input.criticScore +
          CRITIC_BLEND_LOCAL * qEffective) *
          10,
      ) / 10;
    items.push({
      label: "Blend critic 70/30",
      detail: `Critic ${input.criticScore}, local ${qEffective}`,
      points: qFinal,
    });
  }

  const drinkability = inferDrinkabilityWindow({
    vintage: input.vintage,
    wineType: input.wineType,
    cellarPotential: input.cellarPotential,
    drinkabilityStart: input.drinkabilityStart,
    drinkabilityEnd: input.drinkabilityEnd,
  });

  const drinkabilityPenalty = calculateDrinkabilityPenalty({
    drinkabilityStart: drinkability.start,
    drinkabilityEnd: drinkability.end,
    referenceYear: input.referenceYear,
  });

  if (drinkabilityPenalty !== 0) {
    qFinal = Math.round((qFinal + drinkabilityPenalty) * 10) / 10;
    items.push({
      label: "Corectie fereastra consum",
      detail:
        drinkability.start != null && drinkability.end != null
          ? `Optim ${drinkability.start}-${drinkability.end}`
          : "In afara ferestrei optime",
      points: drinkabilityPenalty,
    });
  }

  const price = Math.max(input.price, 1);
  const qualitySurplus = calculateQualitySurplus(qFinal, price);
  items.push({
    label: "Surplus calitate (S)",
    detail: `Q ${qFinal} - 8 x ln(${Math.round(price)}/${30})`,
    points: qualitySurplus,
  });

  const rawSigmoidScore = sigmoidValueScore(qualitySurplus);
  items.push({
    label: "Scor sigmoid brut",
    detail: "100 / (1 + exp(-0.15 x (S - 75)))",
    points: rawSigmoidScore,
  });

  return {
    version: VALUE_SCORE_VERSION,
    qHat,
    qEffective,
    qFinal,
    qualitySurplus,
    rawSigmoidScore,
    drinkabilityPenalty,
    drinkabilityStart: drinkability.start,
    drinkabilityEnd: drinkability.end,
    items,
  };
}

export function buildValueScoreV2Result(
  input: ValueScoreV2Input,
  options?: { percentileScore?: number | null },
): ValueScoreV2Result {
  const core = buildValueScoreV2Core(input);
  const percentileApplied = options?.percentileScore != null;
  const finalScore = percentileApplied
    ? Math.max(
        FINAL_SCORE_MIN,
        Math.min(FINAL_SCORE_MAX, Math.round(options!.percentileScore!)),
      )
    : clampRawSigmoidScore(core.rawSigmoidScore);

  return {
    ...core,
    finalScore,
    percentileApplied,
  };
}

export function calculateValueScoreV2(
  input: ValueScoreV2Input,
  options?: { percentileScore?: number | null },
): number {
  return buildValueScoreV2Result(input, options).finalScore;
}

export interface BatchValueScoreEntry {
  id: number;
  input: ValueScoreV2Input;
}

export interface BatchValueScoreResult {
  id: number;
  core: ValueScoreV2CoreResult;
  finalScore: number;
}

/**
 * Two-pass batch scoring: compute core + sigmoid, then percentile normalize.
 */
export function calculateBatchValueScoresV2(
  entries: BatchValueScoreEntry[],
): BatchValueScoreResult[] {
  const cores = entries.map((entry) => ({
    id: entry.id,
    core: buildValueScoreV2Core(entry.input),
  }));

  const percentileMap = bucketPercentileNormalizeScores(
    cores.map((entry) => ({
      id: entry.id,
      rawScore: entry.core.rawSigmoidScore,
    })),
  );

  return cores.map((entry) => ({
    id: entry.id,
    core: entry.core,
    finalScore:
      percentileMap.get(entry.id) ??
      clampRawSigmoidScore(entry.core.rawSigmoidScore),
  }));
}
