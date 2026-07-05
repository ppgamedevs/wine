/**
 * Praguri Value Score (scala 0-100).
 * Prag minim recomandare = 75/100
 */
export const MIN_RECOMMENDED_VALUE_SCORE = 75;

/** Sub 70: nu recomandam activ; 70-74: pret mediu; 75+: merita banii. */
export const VALUE_SCORE_NEUTRAL_MIN = 70;

export type ValueScoreVerdict = "recommended" | "neutral" | "not_recommended";

export function getValueScoreVerdict(
  score: number | null | undefined,
): ValueScoreVerdict {
  const value = score ?? 0;
  if (value >= MIN_RECOMMENDED_VALUE_SCORE) return "recommended";
  if (value >= VALUE_SCORE_NEUTRAL_MIN) return "neutral";
  return "not_recommended";
}

export function meetsRecommendationThreshold(
  score: number | null | undefined,
): boolean {
  return (score ?? 0) >= MIN_RECOMMENDED_VALUE_SCORE;
}

export function valueScoreVerdictLabel(
  score: number | null | undefined,
): string {
  switch (getValueScoreVerdict(score)) {
    case "recommended":
      return "Merită banii";
    case "neutral":
      return "Preț mediu";
    case "not_recommended":
      return "Nu prea merită la prețul actual";
  }
}
