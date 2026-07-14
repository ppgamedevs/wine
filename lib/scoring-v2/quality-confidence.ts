import type { WineMedal } from "@/lib/schema";
import { clamp, round1 } from "@/lib/scoring-v2/math";
import {
  CONFIDENCE_SCORE_CEILINGS,
  PROVISIONAL_CONFIDENCE_THRESHOLD,
} from "@/lib/scoring-v2/constants";

export interface QualityConfidenceInput {
  grapeVarieties?: string[];
  region?: string;
  wineryName?: string;
  wineMedals?: WineMedal[] | null;
  criticScore?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  hasMlModel: boolean;
  mlPrediction: number | null;
}

export function calculateQualityConfidence(
  input: QualityConfidenceInput,
): number {
  let confidence = 0.18;

  if ((input.grapeVarieties?.length ?? 0) > 0) confidence += 0.12;
  if (input.region?.trim()) confidence += 0.1;
  if (input.wineryName?.trim()) confidence += 0.1;

  const medalCount = input.wineMedals?.length ?? 0;
  confidence += Math.min(0.18, medalCount * 0.04);

  if (
    input.criticScore != null &&
    Number.isFinite(input.criticScore) &&
    input.criticScore >= 70
  ) {
    confidence += 0.14;
  }

  if (input.ratingAvg != null && input.ratingAvg >= 3.5) {
    confidence += 0.08;
  }

  if (input.communityScore != null && input.communityScore >= 55) {
    confidence += 0.06;
  }

  if (input.hasMlModel && input.mlPrediction != null) {
    confidence += 0.12;
  }

  return round1(clamp(confidence, 0.1, 0.95));
}

export function isProvisionalScore(confidence: number): boolean {
  return confidence < PROVISIONAL_CONFIDENCE_THRESHOLD;
}

/** Increderea calculata (0-1) expusa ca procent intreg 0-100 pentru UI/audit. */
export function confidencePercent(confidence: number): number {
  return Math.round(clamp(confidence, 0, 1) * 100);
}

/**
 * Etichete de incredere pe 5 nivele, aliniate cu plafoanele de scor din
 * `CONFIDENCE_SCORE_CEILINGS`. A se afisa mereu separat de scor, niciodata
 * combinat intr-un singur numar care ar putea masca date slabe.
 */
export function confidenceLabel(confidence: number): string {
  const percent = confidencePercent(confidence);
  if (percent >= 85) return "Foarte ridicata";
  if (percent >= 70) return "Ridicata";
  if (percent >= 50) return "Moderata";
  if (percent >= 30) return "Scazuta";
  return "Date insuficiente";
}

/**
 * Scorul maxim permis pentru un nivel de incredere dat (0-100%).
 * Vezi documentatia din `CONFIDENCE_SCORE_CEILINGS` pentru motivatie.
 */
export function resolveConfidenceScoreCeiling(
  confidencePercentValue: number,
): number {
  for (const tier of CONFIDENCE_SCORE_CEILINGS) {
    if (confidencePercentValue >= tier.minConfidencePercent) {
      return tier.maxScore;
    }
  }
  return CONFIDENCE_SCORE_CEILINGS[CONFIDENCE_SCORE_CEILINGS.length - 1]
    .maxScore;
}
