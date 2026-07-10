/**
 * Praguri Value Score v2 (scala 0-100).
 * Calitatea si eficienta pretului sunt afisate separat in UI.
 */
export const MIN_RECOMMENDED_VALUE_SCORE = 75;

export const VALUE_SCORE_EXCEPTIONAL_MIN = 90;
export const VALUE_SCORE_VERY_GOOD_MIN = 82;
export const VALUE_SCORE_FAIR_MIN = 68;
export const VALUE_SCORE_MODEST_MIN = 55;

/** @deprecated Foloseste VALUE_SCORE_FAIR_MIN pentru v2. */
export const VALUE_SCORE_NEUTRAL_MIN = VALUE_SCORE_FAIR_MIN;

export type ValueScoreVerdict =
  | "exceptional"
  | "very_good"
  | "recommended"
  | "fair"
  | "modest"
  | "overpriced";

export function getValueScoreVerdict(
  score: number | null | undefined,
): ValueScoreVerdict {
  const value = score ?? 0;
  if (value >= VALUE_SCORE_EXCEPTIONAL_MIN) return "exceptional";
  if (value >= VALUE_SCORE_VERY_GOOD_MIN) return "very_good";
  if (value >= MIN_RECOMMENDED_VALUE_SCORE) return "recommended";
  if (value >= VALUE_SCORE_FAIR_MIN) return "fair";
  if (value >= VALUE_SCORE_MODEST_MIN) return "modest";
  return "overpriced";
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
    case "very_good":
      return "Achizitie foarte buna";
    case "recommended":
      return "Merita pretul";
    case "fair":
      return "Pret corect";
    case "modest":
      return "Valoare modesta";
    case "overpriced":
      return "Prea scump pentru ce ofera";
  }
}

export const VALUE_SCORE_BANDS = [
  { min: 90, max: 97, label: "Valoare exceptionala" },
  { min: 82, max: 89, label: "Achizitie foarte buna" },
  { min: 75, max: 81, label: "Merita pretul" },
  { min: 68, max: 74, label: "Pret corect" },
  { min: 55, max: 67, label: "Valoare modesta" },
  { min: 0, max: 54, label: "Prea scump pentru ce ofera" },
] as const;
