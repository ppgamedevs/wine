/** Value Score 2.0 calibrated constants (Romanian market). */
export const VALUE_SCORE_VERSION = 2;

export const PRICE_ALPHA = 8;
export const PRICE_REF_RON = 30;

export const SIGMOID_K = 0.15;
export const SIGMOID_S0 = 75;

export const CRITIC_BLEND_CRITIC = 0.7;
export const CRITIC_BLEND_LOCAL = 0.3;
export const CRITIC_MIN_VALID = 70;

export const M1_MAX = 3;
export const M2_MAX = 2;
export const M3_MAX = 2;
export const M4_MAX = 5;
export const M5_MAX = 8;

export const Q_HAT_MIN = 40;
export const Q_HAT_MAX = 98;

export const FINAL_SCORE_MIN = 2;
export const FINAL_SCORE_MAX = 99;

export const DRINKABILITY_TOO_YOUNG_PENALTY_PER_YEAR = 2;
export const DRINKABILITY_TOO_YOUNG_MAX = 6;
export const DRINKABILITY_TOO_OLD_PENALTY_PER_YEAR = 3;
export const DRINKABILITY_TOO_OLD_MAX = 9;

export const M2_PREMIUM_REGIONS = [
  "dealu mare",
  "cotnari",
  "dragasani",
  "murfatlar",
  "dealurile moldovei",
  "minis",
  "stefanesti",
  "podgoria minis",
] as const;

export const M3_REFERENCE_WINERY_PATTERNS = [
  /\bdavino\b/i,
  /\bavincis\b/i,
  /\bprince[\s-]*stirbey\b/i,
  /\bstirbey\b/i,
  /\bserve\b/i,
  /\bliliac\b/i,
  /\boprisor\b/i,
  /\bcrama[\s-]*oprisor\b/i,
] as const;

export const M1_PRESTIGE_GRAPE_PATTERNS: Array<{
  pattern: RegExp;
  requiresQuality?: boolean;
}> = [
  { pattern: /\bfeteasca[\s-]+neagra\b/i },
  { pattern: /\bfeteasca[\s-]+regala\b/i },
  { pattern: /\bnegru[\s-]+de[\s-]+dragasani\b/i },
  { pattern: /\bgrasa[\s-]+de[\s-]+cotnari\b/i },
  { pattern: /\bbusuioaca[\s-]+de[\s-]+bohotin\b/i },
  { pattern: /\bbusuioaca\b/i },
  { pattern: /\btamaioasa[\s-]+romaneasca\b/i, requiresQuality: true },
];

export const M5_TIER1_COMPETITION_PATTERNS = [
  /\bdecanter\b/i,
  /\biwsc\b/i,
  /\binternational wine (&|and) spirit\b/i,
  /\bvinarium\b/i,
  /\bconcours mondial de bruxelles\b/i,
  /\bmondial de bruxelles\b/i,
  /\bbruxelles\b/i,
] as const;
