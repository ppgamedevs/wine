/**
 * Praguri Value Score 2.0 (scala 2-99, normalizare percentile).
 * Prag minim recomandare activa = 75/100
 */
export const MIN_RECOMMENDED_VALUE_SCORE = 75;

/** 55-74: raport onest; sub 55: sub medie. */
export const VALUE_SCORE_NEUTRAL_MIN = 55;

/** Sub 35: pret nejustificat. */
export const VALUE_SCORE_POOR_MIN = 35;

/** 90+: valoare exceptionala (top ~10%). */
export const VALUE_SCORE_EXCEPTIONAL_MIN = 90;

export type ValueScoreVerdict =
  | "exceptional"
  | "recommended"
  | "neutral"
  | "not_recommended"
  | "poor";

export function getValueScoreVerdict(
  score: number | null | undefined,
): ValueScoreVerdict {
  const value = score ?? 0;
  if (value >= VALUE_SCORE_EXCEPTIONAL_MIN) return "exceptional";
  if (value >= MIN_RECOMMENDED_VALUE_SCORE) return "recommended";
  if (value >= VALUE_SCORE_NEUTRAL_MIN) return "neutral";
  if (value >= VALUE_SCORE_POOR_MIN) return "not_recommended";
  return "poor";
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
    case "exceptional":
      return "Valoare exceptionala";
    case "recommended":
      return "Merita banii";
    case "neutral":
      return "Raport onest";
    case "not_recommended":
      return "Sub medie la pretul actual";
    case "poor":
      return "Pret nejustificat";
  }
}
