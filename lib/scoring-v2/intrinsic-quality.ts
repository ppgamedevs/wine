import type { WineMedal } from "@/lib/schema";
import { buildFeatureInputFromWine } from "@/lib/quality-model/features";
import { predictEstimatedQualitySync } from "@/lib/quality-model/predict";
import {
  CRITIC_BLEND_CRITIC,
  CRITIC_BLEND_LOCAL,
  CRITIC_MIN_VALID,
  MEDAL_Q_BOOST_CAP,
  MEDAL_Q_LOG_MULTIPLIER,
  VINTAGE_Q_MAX,
} from "@/lib/scoring-v2/constants";
import { clamp, round1 } from "@/lib/scoring-v2/math";
import { inferDrinkabilityWindow } from "@/lib/scoring-v2/quality-estimate";

export interface IntrinsicQualityInput {
  grapeVarieties?: string[];
  region?: string;
  wineryName?: string;
  wineType?: string;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
  wineMedals?: WineMedal[] | null;
  criticScore?: number | null;
  vintage?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
  referenceYear?: number;
}

function medalWeight(medal: WineMedal): number {
  switch (medal.medal) {
    case "gold":
    case "double_gold":
    case "best_in_class":
      return 7;
    case "silver":
      return 4;
    case "bronze":
      return 2;
    default:
      return 1;
  }
}

/** Moderate medal evidence for Q only (not stacked in Value Score). */
export function medalQualityBoost(
  wineMedals: WineMedal[] | null | undefined,
): number {
  const medals = wineMedals ?? [];
  if (medals.length === 0) return 0;

  const weight = medals.reduce((sum, medal) => sum + medalWeight(medal), 0);
  const raw = MEDAL_Q_LOG_MULTIPLIER * Math.log2(1 + weight);
  return round1(Math.min(MEDAL_Q_BOOST_CAP, raw));
}

function vintageQualityAdjustment(input: IntrinsicQualityInput): number {
  const window = inferDrinkabilityWindow({
    vintage: input.vintage,
    wineType: input.wineType,
    cellarPotential: input.cellarPotential,
    drinkabilityStart: input.drinkabilityStart,
    drinkabilityEnd: input.drinkabilityEnd,
  });

  if (window.start == null || window.end == null || input.vintage == null) {
    return 0;
  }

  const year = input.referenceYear ?? new Date().getFullYear();
  if (year >= window.start && year <= window.end) {
    return Math.min(VINTAGE_Q_MAX, (input.cellarPotential ?? 0) >= 4 ? 2 : 1);
  }

  if (year < window.start) {
    return -Math.min(VINTAGE_Q_MAX, window.start - year);
  }

  return -Math.min(VINTAGE_Q_MAX, year - window.end);
}

function heuristicQualityWithoutPrice(input: IntrinsicQualityInput): number {
  let q = 62;

  if ((input.grapeVarieties?.length ?? 0) > 0) q += 2;
  if (input.region?.trim()) q += 2;
  if (input.wineryName?.trim()) q += 1;

  if (input.tasteProfile?.trim()) {
    const taste = input.tasteProfile
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (/complex|elegant|mineral|persistent|structur/.test(taste)) q += 2;
  }

  if (input.ratingAvg != null && input.ratingAvg >= 3.8) {
    q += Math.min(4, (input.ratingAvg - 3.5) * 6);
  }

  if (input.communityScore != null && input.communityScore >= 60) {
    q += Math.min(3, (input.communityScore - 60) / 12);
  }

  return clamp(q, 48, 82);
}

/**
 * Q_model: calitate intrinseca fara pret.
 * ML include deja regiune/crama/soi/medalii; nu adaugam bonusuri duplicate.
 */
export function buildModelQuality(input: IntrinsicQualityInput): {
  modelQuality: number;
  mlUsed: boolean;
  mlPrediction: number | null;
  medalBoostApplied: number;
} {
  const features = buildFeatureInputFromWine({
    type: input.wineType,
    vintage: input.vintage,
    grapeVarieties: input.grapeVarieties,
    region: input.region,
    winery: input.wineryName,
    acidity: input.acidity,
    cellarPotential: input.cellarPotential,
    medals: input.wineMedals,
  });

  const mlPrediction = predictEstimatedQualitySync(features);
  const mlUsed = mlPrediction != null;

  let modelQuality = mlUsed
    ? mlPrediction
    : heuristicQualityWithoutPrice(input);

  const medalBoostApplied = mlUsed ? 0 : medalQualityBoost(input.wineMedals);
  modelQuality += medalBoostApplied;
  modelQuality += vintageQualityAdjustment(input);

  if (
    input.criticScore != null &&
    Number.isFinite(input.criticScore) &&
    input.criticScore >= CRITIC_MIN_VALID
  ) {
    modelQuality =
      CRITIC_BLEND_CRITIC * input.criticScore +
      CRITIC_BLEND_LOCAL * modelQuality;
  }

  return {
    modelQuality: round1(clamp(modelQuality, 40, 95)),
    mlUsed,
    mlPrediction,
    medalBoostApplied,
  };
}

export function shrinkQualityToPrior(
  modelQuality: number,
  peerQualityPrior: number,
  confidence: number,
): number {
  const safeConfidence = clamp(confidence, 0, 1);
  return round1(
    peerQualityPrior + safeConfidence * (modelQuality - peerQualityPrior),
  );
}
