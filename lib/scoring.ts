import type { OverpricedRisk } from "@/types";
import { dessertFoodMatchBoost } from "@/lib/dessert-pairings";
import {
  buildValueScoreV2Result,
  type ValueScoreV2Input,
} from "@/lib/scoring-v2";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_NEUTRAL_MIN,
} from "@/lib/value-score-thresholds";
import type { WineMedal } from "@/lib/schema";

export interface ScoreInput {
  price: number;
  category: string;
  region?: string;
  grapeVarieties?: string[];
  sweetness?: string | null;
  dessertPairingCount?: number;
  /** Calitate de baza 0-100 (LLM, note degustare sau import). */
  baseQuality?: number;
  wineMedals?: WineMedal[];
  criticScore?: number;
  wineryName?: string;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
}

export interface ValueScoreInput {
  price: number;
  isAutochthonous: boolean;
  region: string;
  /** 0-100 (din LLM, ML sau note degustare). */
  baseQuality?: number;
  wineMedals?: WineMedal[];
  criticScore?: number;
  grapeVarieties?: string[];
  wineryName?: string;
  wineType?: string;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
  vintage?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
  estimatedQuality?: number | null;
  referenceYear?: number;
  /** Scor percentile din batch recalc (optional). */
  percentileScore?: number | null;
}

export interface InitialScores {
  valueScore: number;
  giftScore: number;
  foodMatchScore: number;
  overpricedRisk: OverpricedRisk;
  beginnerFriendly: boolean;
  cellarPotential: number;
}

/** LLM score suggestions on 1-10 scale (converted to 1-100 internally). */
export interface LlmScoreSuggestions {
  valueScore?: number | null;
  giftScore?: number | null;
  foodMatchScore?: number | null;
}

export interface MergedAnalysisScores extends InitialScores {
  ruleBased: InitialScores;
  llmSuggestions: {
    valueScore: number | null;
    giftScore: number | null;
    foodMatchScore: number | null;
  };
  adjustments: {
    valueScore: number;
    giftScore: number;
    foodMatchScore: number;
  };
}

const MAX_LLM_NUDGE = 12;

function llm1to10To100(score: number): number {
  return toSiteScale(score);
}

function applyRuleBasedNudge(
  ruleScore: number,
  llm1to10: number | null | undefined,
): number {
  if (llm1to10 == null) return ruleScore;
  const llm100 = llm1to10To100(llm1to10);
  const diff = llm100 - ruleScore;
  const nudge =
    Math.sign(diff) * Math.min(Math.abs(diff), MAX_LLM_NUDGE) * 0.35;
  return Math.round(Math.min(100, Math.max(10, ruleScore + nudge)));
}

/**
 * Combines rule-based scores with optional LLM suggestions.
 * Rule-based scores are the base; LLM can nudge slightly when it has extra context.
 */
export function mergeAnalysisScores(
  ruleScores: InitialScores,
  price: number,
  llm: LlmScoreSuggestions = {},
): MergedAnalysisScores {
  const llmSuggestions = {
    valueScore: llm.valueScore ?? null,
    giftScore: llm.giftScore ?? null,
    foodMatchScore: llm.foodMatchScore ?? null,
  };

  const valueScore = applyRuleBasedNudge(
    ruleScores.valueScore,
    llmSuggestions.valueScore,
  );
  const giftScore = applyRuleBasedNudge(
    ruleScores.giftScore,
    llmSuggestions.giftScore,
  );
  const foodMatchScore = applyRuleBasedNudge(
    ruleScores.foodMatchScore,
    llmSuggestions.foodMatchScore,
  );

  return {
    valueScore,
    giftScore,
    foodMatchScore,
    overpricedRisk: inferOverpricedRisk(price, valueScore),
    beginnerFriendly: ruleScores.beginnerFriendly,
    cellarPotential: ruleScores.cellarPotential,
    ruleBased: ruleScores,
    llmSuggestions,
    adjustments: {
      valueScore: valueScore - ruleScores.valueScore,
      giftScore: giftScore - ruleScores.giftScore,
      foodMatchScore: foodMatchScore - ruleScores.foodMatchScore,
    },
  };
}

export function formatScoreProvenance(merged: MergedAnalysisScores): string {
  const fmt = (score: number | null) =>
    score != null ? `${score}/10` : "n/a";

  return [
    "Scoruri VinIntel:",
    `- Value: ${merged.valueScore}/100 (baza algoritm ${merged.ruleBased.valueScore}, sugestie AI ${fmt(merged.llmSuggestions.valueScore)}, ajustare ${merged.adjustments.valueScore >= 0 ? "+" : ""}${merged.adjustments.valueScore})`,
    `- Gift: ${merged.giftScore}/100 (baza ${merged.ruleBased.giftScore}, sugestie AI ${fmt(merged.llmSuggestions.giftScore)})`,
    `- Food Match: ${merged.foodMatchScore}/100 (baza ${merged.ruleBased.foodMatchScore}, sugestie AI ${fmt(merged.llmSuggestions.foodMatchScore)})`,
  ].join("\n");
}

function clamp1to10(value: number): number {
  return Math.min(10, Math.max(1, value));
}

function normalizeCategory(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toSiteScale(score1to10: number): number {
  return clamp1to10(score1to10) * 10;
}

function inferOverpricedRisk(
  price: number,
  valueScore: number,
): OverpricedRisk {
  if (valueScore >= MIN_RECOMMENDED_VALUE_SCORE && price <= 80) return "low";
  if (valueScore < VALUE_SCORE_NEUTRAL_MIN) return "high";
  if (price > 80 && valueScore < MIN_RECOMMENDED_VALUE_SCORE) return "high";
  if (valueScore <= 45 || price > 120) return "high";
  return "medium";
}

function toValueScoreV2Input(wine: ValueScoreInput): ValueScoreV2Input {
  return {
    price: wine.price,
    grapeVarieties: wine.grapeVarieties,
    region: wine.region,
    wineryName: wine.wineryName,
    wineType: wine.wineType,
    cellarPotential: wine.cellarPotential,
    acidity: wine.acidity,
    tasteProfile: wine.tasteProfile,
    wineMedals: wine.wineMedals,
    criticScore: wine.criticScore,
    vintage: wine.vintage,
    ratingAvg: wine.ratingAvg,
    communityScore: wine.communityScore,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
    estimatedQuality: wine.estimatedQuality ?? wine.baseQuality,
    referenceYear: wine.referenceYear,
  };
}

const VALUE_SCORE_PREMIUM_REGIONS = [
  "dealu mare",
  "dragasani",
  "cotnari",
  "murfatlar",
  "dealurile moldovei",
] as const;

const AUTOCHTHONOUS_GRAPE_PATTERNS = [
  /\bfeteasca\b/i,
  /\btamaioasa\b/i,
  /\bbusuioaca\b/i,
  /\bbabeasca\b/i,
  /\brara neagra\b/i,
  /\bcramposie\b/i,
  /\bgrasa de cotnari\b/i,
  /\bgrasa\b/i,
  /\bnovac\b/i,
  /\bsarba\b/i,
  /\bfrincusa\b/i,
  /\bnegru de dragasani\b/i,
  /\bgalbena de odobesti\b/i,
  /\bgalbena\b/i,
] as const;

function normalizeRegionLabel(region: string): string {
  return region
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeGrapeHaystack(grapes: string[]): string {
  return grapes
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isAutochthonousGrapeMix(grapeVarieties?: string[]): boolean {
  if (!grapeVarieties?.length) return false;
  const haystack = normalizeGrapeHaystack(grapeVarieties);
  return AUTOCHTHONOUS_GRAPE_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function isPremiumValueRegion(region: string): boolean {
  const normalized = normalizeRegionLabel(region);
  if (!normalized) return false;
  return VALUE_SCORE_PREMIUM_REGIONS.some(
    (name) => normalized === name || normalized.includes(name),
  );
}

interface MedalBonusBreakdown {
  total: number;
  items: ValueScoreBreakdownItem[];
}

const HIGH_PRESTIGE_COMPETITION_KEYWORDS = [
  "decanter",
  "balkans international",
  "balkan international",
  "vinarium",
  "vinarum",
  "iwsc",
  "decanter world wine awards",
] as const;

const MEDAL_BONUS_CAP = 38;
const RECENT_MEDAL_MIN_YEAR = 2024;
const RECENT_MEDAL_MAX_BONUS = 6;
const RECENT_MEDAL_POINTS_EACH = 3;

function basePointsForMedalLevel(medal: WineMedal["medal"]): number {
  switch (medal) {
    case "gold":
    case "double_gold":
      return 7;
    case "silver":
      return 4;
    case "bronze":
      return 2;
    default:
      return 2;
  }
}

function isHighPrestigeCompetition(competition: string): boolean {
  const lower = competition.toLowerCase();
  return HIGH_PRESTIGE_COMPETITION_KEYWORDS.some((keyword) =>
    lower.includes(keyword),
  );
}

function pointsForSingleMedal(medal: WineMedal): number {
  let points = basePointsForMedalLevel(medal.medal);

  if (isHighPrestigeCompetition(medal.competition)) {
    points += 4;
  }

  return points;
}

/** Bonus medalii: tip, prestigiu, consistenta, recenta. Plafon 38. */
export function calculateMedalBonus(
  wineMedals: WineMedal[] | null | undefined,
): MedalBonusBreakdown {
  const medals = wineMedals ?? [];
  const items: ValueScoreBreakdownItem[] = [];

  if (medals.length === 0) {
    return { total: 0, items };
  }

  let bonus = 0;
  let perMedalPoints = 0;
  let highPrestigeCount = 0;

  for (const medal of medals) {
    const points = pointsForSingleMedal(medal);
    perMedalPoints += points;
    bonus += points;

    if (isHighPrestigeCompetition(medal.competition)) {
      highPrestigeCount += 1;
    }
  }

  items.push({
    label: "Medalii si concursuri",
    detail: `${medals.length} medalii (gold +7, silver +4, bronze +2; ${highPrestigeCount} la concursuri high prestige +4)`,
    points: perMedalPoints,
  });

  const years = new Set(
    medals
      .map((medal) => medal.year)
      .filter((year): year is number => year != null),
  );

  if (years.size >= 3) {
    bonus += 6;
    items.push({
      label: "Consistenta pe ani (3+)",
      detail: `Medalii in ${years.size} ani diferiti`,
      points: 6,
    });
  }

  if (years.size >= 5) {
    bonus += 4;
    items.push({
      label: "Consistenta pe ani (5+)",
      detail: "Track record indelungat la concursuri",
      points: 4,
    });
  }

  const recentMedals = medals.filter(
    (medal) => medal.year != null && medal.year >= RECENT_MEDAL_MIN_YEAR,
  );
  if (recentMedals.length > 0) {
    const recentBonus = Math.min(
      recentMedals.length * RECENT_MEDAL_POINTS_EACH,
      RECENT_MEDAL_MAX_BONUS,
    );
    bonus += recentBonus;
    items.push({
      label: "Medalii recente",
      detail: `${recentMedals.length} medalii din ${RECENT_MEDAL_MIN_YEAR}+ (+${RECENT_MEDAL_POINTS_EACH}/medalie, max ${RECENT_MEDAL_MAX_BONUS})`,
      points: recentBonus,
    });
  }

  const rawTotal = bonus;
  const total = Math.min(bonus, MEDAL_BONUS_CAP);

  if (total < rawTotal) {
    items.push({
      label: "Plafon bonus medalii",
      detail: `Total brut ${rawTotal}, plafonat la ${MEDAL_BONUS_CAP}`,
      points: total - rawTotal,
    });
  }

  return { total, items };
}

/** Regiuni de elita pentru bonus terroir in Clasa Mondiala (+4). */
const WORLD_CLASS_ELITE_REGIONS = ["dealu mare", "cotnari"] as const;

/** Crame cu istoric demonstrat de vinuri de top (+4). */
const WORLD_CLASS_WINERY_PATTERNS = [
  /\bdavino\b/i,
  /\bavincis\b/i,
  /\bcotnari\b/i,
  /\bprince\s*stirbey\b/i,
  /\bstirbey\b/i,
  /\bcramele\s*recas\b/i,
  /\brecas\b/i,
] as const;

/** Soiuri autohtone de clasa mondiala (+5). Tamaioasa necesita semnal de calitate. */
const ELITE_AUTOCHTHONOUS_GRAPE_PATTERNS: Array<{
  pattern: RegExp;
  requiresQuality?: boolean;
}> = [
  { pattern: /\bfeteasca[\s-]+neagra\b/i },
  { pattern: /\bnegru[\s-]+de[\s-]+dragasani\b/i },
  { pattern: /\bgrasa[\s-]+de[\s-]+cotnari\b/i },
  { pattern: /\btamaioasa[\s-]+romaneasca\b/i, requiresQuality: true },
];

function isWorldClassEliteRegion(region: string): boolean {
  const normalized = normalizeRegionLabel(region);
  if (!normalized) return false;
  return WORLD_CLASS_ELITE_REGIONS.some(
    (name) => normalized === name || normalized.includes(name),
  );
}

function isWorldClassEliteGrape(
  grapes: string[] | undefined,
  baseQuality: number,
  medalCount: number,
): boolean {
  if (!grapes?.length) return false;
  const haystack = normalizeGrapeHaystack(grapes);

  return ELITE_AUTOCHTHONOUS_GRAPE_PATTERNS.some(({ pattern, requiresQuality }) => {
    if (!pattern.test(haystack)) return false;
    if (!requiresQuality) return true;
    // Tamaioasa Romaneasca: doar cu profil de calitate clar (scor, medalii sau pret premium).
    return baseQuality >= 72 || medalCount >= 2 || haystack.includes("selectie");
  });
}

function isWorldClassWinery(wineryName: string | undefined): boolean {
  if (!wineryName?.trim()) return false;
  const normalized = wineryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return WORLD_CLASS_WINERY_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Estimeaza bonusul de potential la invechire (+3 .. +6).
 * Foloseste cellarPotential (ani), tip rosu, aciditate si indicii din profilul de gust.
 */
function calculateAgingPotentialBonus(input: {
  wineType?: string;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
}): number {
  const wineType = normalizeCategory(input.wineType ?? "");
  const isRed = wineType === "rosu" || wineType === "red";
  const cellarYears = input.cellarPotential ?? 0;
  const taste = (input.tasteProfile ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const structureSignals =
    /tanin|structur|barrique|butoi|stejar|invech|evolut|corpolent|corp\b|persistent|miner|potential/.test(
      taste,
    );

  if (cellarYears >= 10) return 6;
  if (cellarYears >= 6) return 5;
  if (cellarYears >= 4) return 4;
  if (cellarYears >= 2) return 3;
  if (isRed && structureSignals) return 4;
  if (isRed && input.acidity != null && input.acidity >= 4.5) return 3;

  return 0;
}

interface WorldClassBonusBreakdown {
  total: number;
  items: ValueScoreBreakdownItem[];
}

/**
 * Clasa Mondiala / Potential: terroir, soiuri iconice, potential pivnita, crame de referinta.
 * Componentele se cumuleaza; plafon 19 (5+4+6+4) pentru echilibru cu restul formulei.
 */
const WORLD_CLASS_BONUS_CAP = 19;

export function calculateWorldClassPotentialBonus(
  wine: Pick<
    ValueScoreInput,
    | "region"
    | "baseQuality"
    | "wineMedals"
    | "grapeVarieties"
    | "wineryName"
    | "wineType"
    | "cellarPotential"
    | "acidity"
    | "tasteProfile"
  >,
): WorldClassBonusBreakdown {
  const items: ValueScoreBreakdownItem[] = [];
  let bonus = 0;
  const medalCount = wine.wineMedals?.length ?? 0;

  if (
    isWorldClassEliteGrape(
      wine.grapeVarieties,
      wine.baseQuality ?? 62,
      medalCount,
    )
  ) {
    bonus += 5;
    items.push({
      label: "Soi autohton de clasa mondiala",
      detail:
        "Feteasca Neagra, Negru de Dragasani, Grasa de Cotnari sau Tamaioasa Romaneasca de calitate",
      points: 5,
    });
  }

  if (isWorldClassEliteRegion(wine.region)) {
    bonus += 4;
    items.push({
      label: "Terroir de elita",
      detail: "Dealu Mare sau Cotnari",
      points: 4,
    });
  }

  const agingBonus = calculateAgingPotentialBonus({
    wineType: wine.wineType,
    cellarPotential: wine.cellarPotential,
    acidity: wine.acidity,
    tasteProfile: wine.tasteProfile,
  });
  if (agingBonus > 0) {
    bonus += agingBonus;
    items.push({
      label: "Potential de invechire",
      detail:
        "Structura, taninuri, aciditate sau cellar potential documentat",
      points: agingBonus,
    });
  }

  if (isWorldClassWinery(wine.wineryName)) {
    bonus += 4;
    items.push({
      label: "Crama de referinta",
      detail: "Istoric demonstrat de vinuri de top",
      points: 4,
    });
  }

  const rawTotal = bonus;
  const total = Math.min(bonus, WORLD_CLASS_BONUS_CAP);

  if (total < rawTotal) {
    items.push({
      label: "Plafon Clasa Mondiala",
      detail: `Total brut ${rawTotal}, plafonat la ${WORLD_CLASS_BONUS_CAP}`,
      points: total - rawTotal,
    });
  }

  return { total, items };
}

/**
 * Value Score VinIntel 2.0 (0-100, normalizare percentile la recalcul batch).
 */
export function calculateValueScore(wine: ValueScoreInput): number {
  return buildValueScoreBreakdown(wine).finalScore;
}

export interface ValueScoreBreakdownItem {
  label: string;
  detail: string;
  points: number;
}

export interface ValueScoreBreakdown {
  items: ValueScoreBreakdownItem[];
  subtotal: number;
  penaltyNote: string | null;
  finalScore: number;
  qHat?: number;
  qEffective?: number;
  qFinal?: number;
  qualitySurplus?: number;
  rawSigmoidScore?: number;
  version?: number;
}

/**
 * Transparent breakdown of VinIntel Score 2.0 factors for UI display.
 */
export function buildValueScoreBreakdown(wine: ValueScoreInput): ValueScoreBreakdown {
  const v2Input = toValueScoreV2Input(wine);
  const result = buildValueScoreV2Result(v2Input, {
    percentileScore: wine.percentileScore,
  });

  const penaltyNote =
    result.drinkabilityPenalty < 0
      ? "Scor ajustat pentru fereastra optima de consum."
      : null;

  return {
    items: result.items,
    subtotal: Math.round(result.rawSigmoidScore),
    penaltyNote,
    finalScore: result.finalScore,
    qHat: result.qHat,
    qEffective: result.qEffective,
    qFinal: result.qFinal,
    qualitySurplus: result.qualitySurplus,
    rawSigmoidScore: result.rawSigmoidScore,
    version: result.version,
  };
}

/** Legacy v1 breakdown (additive model, clamp 45-98). */
export function buildValueScoreV1Breakdown(wine: ValueScoreInput & { baseQuality: number }): ValueScoreBreakdown {
  const items: ValueScoreBreakdownItem[] = [];
  let score = 0;

  // Calitate + eficienta pret: 43% / 32% (compenseaza usor vs 40%/30%, fara supra-recompensare).
  const qualityPoints = wine.baseQuality * 0.43;
  score += qualityPoints;
  items.push({
    label: "Calitate de baza",
    detail: `${wine.baseQuality}/100 x 43%`,
    points: Math.round(qualityPoints * 10) / 10,
  });

  const priceEfficiency = Math.max(0, wine.baseQuality - wine.price / 4);
  const efficiencyPoints = priceEfficiency * 0.32;
  score += efficiencyPoints;
  items.push({
    label: "Eficienta pret",
    detail: `Calitate minus pret (${wine.price} RON / 4) x 32%`,
    points: Math.round(efficiencyPoints * 10) / 10,
  });

  if (wine.isAutochthonous) {
    score += 11;
    items.push({
      label: "Soi autohton romanesc",
      detail: "Feteasca, Busuioaca, Tamaioasa, Rara Neagra etc.",
      points: 11,
    });
  }

  if (isPremiumValueRegion(wine.region)) {
    score += 7;
    items.push({
      label: "Regiune viticola premium",
      detail: wine.region || "Regiune recunoscuta",
      points: 7,
    });
  }

  const worldClassBonus = calculateWorldClassPotentialBonus(wine);
  if (worldClassBonus.total > 0) {
    score += worldClassBonus.total;
    items.push(...worldClassBonus.items);
  }

  const medalBonus = calculateMedalBonus(wine.wineMedals);
  if (medalBonus.total > 0) {
    score += medalBonus.total;
    items.push(...medalBonus.items);
  }

  if (wine.criticScore != null && Number.isFinite(wine.criticScore)) {
    const criticPoints = (wine.criticScore - 80) * 0.5;
    if (criticPoints !== 0) {
      score += criticPoints;
      items.push({
        label: "Scor critic",
        detail: `${wine.criticScore}/100 (referinta 80) x 0.5`,
        points: Math.round(criticPoints * 10) / 10,
      });
    }
  }

  let penaltyNote: string | null = null;
  if (wine.price > 150 && score < 85) {
    const capped = Math.min(score, 82);
    if (capped < score) {
      penaltyNote =
        "Vin scump (peste 150 RON): scorul a fost plafonat la 82 pana cand calitatea justifica pretul.";
      score = capped;
    }
  }

  const subtotal = Math.round(score);
  const finalScore = Math.max(45, Math.min(98, Math.round(score)));

  return {
    items,
    subtotal,
    penaltyNote,
    finalScore,
    version: 1,
  };
}

export function valueScoreInputFromWine(wine: {
  priceAvg: number | null;
  currentPrice?: number | null;
  grapeVarieties: { name: string }[] | string[] | null;
  region?: { name: string } | null;
  valueScore?: number | null;
  medals?: WineMedal[] | null;
  winery?: { name: string } | null;
  type?: string | null;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
  vintage?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  criticScore?: number | null;
  estimatedQuality?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
}): ValueScoreInput {
  const price = wine.currentPrice ?? wine.priceAvg ?? 0;
  const grapes = (wine.grapeVarieties ?? []).map((g) =>
    typeof g === "string" ? g : g.name,
  );
  return {
    price,
    isAutochthonous: isAutochthonousGrapeMix(grapes),
    region: wine.region?.name ?? "",
    baseQuality: wine.estimatedQuality ?? undefined,
    wineMedals: wine.medals ?? [],
    grapeVarieties: grapes,
    wineryName: wine.winery?.name,
    wineType: wine.type ?? undefined,
    cellarPotential: wine.cellarPotential,
    acidity: wine.acidity,
    tasteProfile: wine.tasteProfile,
    vintage: wine.vintage,
    ratingAvg: wine.ratingAvg,
    communityScore: wine.communityScore,
    criticScore: wine.criticScore ?? undefined,
    estimatedQuality: wine.estimatedQuality,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
  };
}


/**
 * Rule-based scores for CSV import (1-10 logic, stored as 1-100 in DB).
 * Prag minim recomandare = 75/100 (vezi lib/value-score-thresholds.ts).
 * Rafinare ulterioara: db:editorial sau logica din lib/sommelier.ts.
 */
export function calculateInitialScores(input: ScoreInput): InitialScores {
  const { price, category, sweetness, grapeVarieties, dessertPairingCount } =
    input;
  const cat = normalizeCategory(category);

  const valueScore = calculateValueScore({
    price,
    isAutochthonous: isAutochthonousGrapeMix(grapeVarieties),
    region: input.region ?? "",
    baseQuality: input.baseQuality,
    estimatedQuality: input.baseQuality,
    wineMedals: input.wineMedals,
    criticScore: input.criticScore,
    grapeVarieties,
    wineryName: input.wineryName,
    wineType: cat,
    cellarPotential: input.cellarPotential,
    acidity: input.acidity,
    tasteProfile: input.tasteProfile,
  });

  let giftScore = 6;
  if (cat === "spumant" || cat === "sparkling") giftScore = 8;
  if (price > 100) giftScore = 7;

  let foodMatchScore = 7;
  if (cat === "rosu" || cat === "red") foodMatchScore = 8;

  const dessertBoost = dessertFoodMatchBoost({
    category: cat,
    sweetness,
    grapeVarieties,
    dessertPairingCount,
  });
  foodMatchScore = Math.min(10, foodMatchScore + dessertBoost);

  const scaledGift = toSiteScale(giftScore);
  const scaledFood = toSiteScale(foodMatchScore);

  return {
    valueScore,
    giftScore: scaledGift,
    foodMatchScore: scaledFood,
    overpricedRisk: inferOverpricedRisk(price, valueScore),
    beginnerFriendly: valueScore >= 70 && price <= 65,
    cellarPotential:
      (cat === "rosu" || cat === "red") && price >= 60 ? 4 : 2,
  };
}
