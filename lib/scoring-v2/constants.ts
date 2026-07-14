/** VinIntel Value Score v2: calitate intrinseca + eficienta pret. */
export const VALUE_SCORE_VERSION = 2;

export const QUALITY_WEIGHT = 0.72;
export const PRICE_EFFICIENCY_WEIGHT = 0.28;

export const PRICE_EFFICIENCY_BASE = 70;
export const PRICE_EFFICIENCY_SLOPE = 3;
export const PRICE_EFFICIENCY_MIN = 35;
export const PRICE_EFFICIENCY_MAX = 97;

export const FINAL_SCORE_MIN = 35;
export const FINAL_SCORE_MAX = 97;

export const QUALITY_FLOOR_OFFSET = 20;
export const QUALITY_CEILING_OFFSET = 8;

export const PROVISIONAL_CONFIDENCE_THRESHOLD = 0.45;

/** Medalii: efect total in Q, nu in Value Score separat. */
export const MEDAL_Q_BOOST_CAP = 6;
export const MEDAL_Q_LOG_MULTIPLIER = 1.5;

export const CRITIC_BLEND_CRITIC = 0.65;
export const CRITIC_BLEND_LOCAL = 0.35;
export const CRITIC_MIN_VALID = 70;

export const VINTAGE_Q_MAX = 2;

export const DEFAULT_PEER_Q_PRIOR = 72;

/**
 * Plafoane explicite de scor bazate pe increderea datelor (0-100%).
 *
 * Motivatie de business: date insuficiente NU trebuie sa poata produce un
 * scor "exceptional" doar pentru ca lipsesc informatii (lipsa nu e semnal
 * pozitiv). Acest tabel este o plasa de siguranta suplimentara peste
 * shrinkage-ul catre peer prior (`shrinkQualityToPrior`): indiferent cat de
 * mare ar fi calitatea estimata (Q) sau eficienta pretului, scorul final nu
 * poate depasi plafonul asociat nivelului de incredere.
 *
 * Ordonat descrescator; se aplica primul prag pentru care
 * `confidencePercent >= minConfidencePercent`. Pragurile sunt intentionat
 * explicite si documentate aici (nu "magic numbers" ascunse) si sunt
 * publicate si in metodologia publica (/cum-functioneaza-scorurile).
 */
export const CONFIDENCE_SCORE_CEILINGS = [
  { minConfidencePercent: 85, maxScore: FINAL_SCORE_MAX },
  { minConfidencePercent: 70, maxScore: 94 },
  { minConfidencePercent: 50, maxScore: 87 },
  { minConfidencePercent: 30, maxScore: 79 },
  { minConfidencePercent: 0, maxScore: 69 },
] as const;
