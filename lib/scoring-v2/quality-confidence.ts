import type { WineMedal } from "@/lib/schema";
import { clamp, round1 } from "@/lib/scoring-v2/math";
import { PROVISIONAL_CONFIDENCE_THRESHOLD } from "@/lib/scoring-v2/constants";

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

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return "Ridicata";
  if (confidence >= 0.55) return "Medie";
  if (confidence >= PROVISIONAL_CONFIDENCE_THRESHOLD) return "Moderata";
  return "Scazuta";
}
