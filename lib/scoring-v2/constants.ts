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
