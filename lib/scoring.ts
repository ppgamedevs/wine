import type { OverpricedRisk } from "@/types";
import {
  inferDrinkabilityWindow,
} from "@/lib/scoring-v2/quality-estimate";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import {
  GIFT_SCORE_ALGORITHM_VERSION,
  FOOD_VERSATILITY_ALGORITHM_VERSION,
  OCCASION_MATCH_ALGORITHM_VERSION,
} from "@/lib/scoring-v2/constants";
import {
  calculateVinIntelScore,
  type VinIntelScoreInput,
} from "@/lib/scoring-v2/value-score";
import { buildFeatureInputFromWine } from "@/lib/quality-model/features";
import { predictEstimatedQualitySync } from "@/lib/quality-model/predict";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_FAIR_MIN,
} from "@/lib/value-score-thresholds";
import type { FoodPairing, WineMedal } from "@/lib/schema";

export const VALUE_SCORE_ALGORITHM_VERSION = 2;
export {
  GIFT_SCORE_ALGORITHM_VERSION,
  FOOD_VERSATILITY_ALGORITHM_VERSION,
  OCCASION_MATCH_ALGORITHM_VERSION,
};

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
  valueScore?: number | null;
  estimatedQuality?: number | null;
  qualityFinal?: number | null;
  vintage?: number | null;
  foodPairings?: FoodPairing[];
  producerCulinaryPairings?: string | null;
  alcohol?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
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
  cellarPotentialVerified?: boolean;
  acidity?: number | null;
  tasteProfile?: string | null;
  vintage?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
  estimatedQuality?: number | null;
  referenceYear?: number;
}

export interface InitialScores {
  valueScore: number;
  giftScore: number;
  foodMatchScore: number;
  overpricedRisk: OverpricedRisk;
  beginnerFriendly: boolean;
  /** Nu mai e inferat din tip+pret. Null daca nu exista valoare existenta. */
  cellarPotential: number | null;
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

/**
 * Combines rule-based scores. LLM suggestions for Gift/Food are ignored.
 * Value Score remains the deterministic v2 result.
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

  const valueScore = ruleScores.valueScore;
  const giftScore = ruleScores.giftScore;
  const foodMatchScore = ruleScores.foodMatchScore;

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
    `- Gift: ${merged.giftScore}/100 (Gift Score v${GIFT_SCORE_ALGORITHM_VERSION}, deterministic)`,
    `- Versatilitate la masa: ${merged.foodMatchScore}/100 (Food Versatility v${FOOD_VERSATILITY_ALGORITHM_VERSION}, deterministic)`,
  ].join("\n");
}

function normalizeCategory(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inferOverpricedRisk(
  price: number,
  valueScore: number,
): OverpricedRisk {
  if (valueScore >= MIN_RECOMMENDED_VALUE_SCORE && price <= 80) return "low";
  if (valueScore < VALUE_SCORE_FAIR_MIN) return "high";
  if (price > 80 && valueScore < MIN_RECOMMENDED_VALUE_SCORE) return "high";
  if (valueScore <= 50 || price > 120) return "high";
  return "medium";
}

function defaultBaseQuality(price: number): number {
  if (price <= 35) return 72;
  if (price <= 55) return 68;
  if (price <= 85) return 65;
  if (price <= 120) return 62;
  return 58;
}

function resolveBaseQuality(wine: ValueScoreInput): number {
  if (wine.estimatedQuality != null && Number.isFinite(wine.estimatedQuality)) {
    return wine.estimatedQuality;
  }

  const mlQuality = predictEstimatedQualitySync(
    buildFeatureInputFromWine({
      type: wine.wineType,
      vintage: wine.vintage,
      grapeVarieties: wine.grapeVarieties,
      region: wine.region,
      winery: wine.wineryName,
      alcohol: undefined,
      acidity: wine.acidity,
      cellarPotential:
        wine.cellarPotentialVerified === true ? wine.cellarPotential : null,
      medals: wine.wineMedals,
    }),
  );
  if (mlQuality != null) {
    return mlQuality;
  }

  return wine.baseQuality ?? defaultBaseQuality(wine.price);
}

function dynamicScoreBounds(baseQuality: number): { min: number; max: number } {
  return {
    min: Math.max(25, baseQuality - 40),
    max: Math.min(98, baseQuality + 35),
  };
}

function clampScore(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
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

function getMedalWeight(medal: WineMedal): number {
  return pointsForSingleMedal(medal);
}

/** Bonus medalii logaritmic: 8 x log2(1 + pondere), plafon 38. */
export function calculateMedalBonus(
  wineMedals: WineMedal[] | null | undefined,
): MedalBonusBreakdown {
  const medals = wineMedals ?? [];
  const items: ValueScoreBreakdownItem[] = [];

  if (medals.length === 0) {
    return { total: 0, items };
  }

  const weightedMedals = medals.reduce(
    (sum, medal) => sum + getMedalWeight(medal),
    0,
  );
  const rawBonus = 8 * Math.log2(1 + weightedMedals);
  const total = Math.min(MEDAL_BONUS_CAP, Math.round(rawBonus * 10) / 10);

  const highPrestigeCount = medals.filter((medal) =>
    isHighPrestigeCompetition(medal.competition),
  ).length;

  items.push({
    label: "Medalii si concursuri",
    detail: `${medals.length} medalii, pondere ${Math.round(weightedMedals * 10) / 10}, 8 x log2(1 + w)`,
    points: total,
  });

  if (rawBonus > MEDAL_BONUS_CAP) {
    items.push({
      label: "Plafon bonus medalii",
      detail: `Total brut ${Math.round(rawBonus * 10) / 10}, plafonat la ${MEDAL_BONUS_CAP}`,
      points: total - rawBonus,
    });
  }

  if (highPrestigeCount > 0) {
    items.push({
      label: "Concursuri high prestige",
      detail: `${highPrestigeCount} medalii la concursuri de top (incluse in pondere)`,
      points: 0,
    });
  }

  return { total, items };
}

function isInOptimalDrinkabilityWindow(wine: ValueScoreInput): boolean {
  const window = inferDrinkabilityWindow({
    vintage: wine.vintage,
    wineType: wine.wineType,
    cellarPotential: wine.cellarPotential,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
  });

  if (window.start == null || window.end == null) return false;

  const year = wine.referenceYear ?? new Date().getFullYear();
  return year >= window.start && year <= window.end;
}

function calculateVintageBonus(wine: ValueScoreInput): {
  bonus: number;
  item: ValueScoreBreakdownItem | null;
} {
  if (!isInOptimalDrinkabilityWindow(wine)) {
    return { bonus: 0, item: null };
  }

  const cellarYears = wine.cellarPotential ?? 0;
  if (cellarYears <= 0) {
    return { bonus: 0, item: null };
  }

  const bonus = Math.min(5, Math.round((cellarYears / 2) * 10) / 10);
  const window = inferDrinkabilityWindow({
    vintage: wine.vintage,
    wineType: wine.wineType,
    cellarPotential: wine.cellarPotential,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
  });

  return {
    bonus,
    item: {
      label: "Bonus vintage (fereastra optima)",
      detail: `Consum optim ${window.start}-${window.end}, cellar ${cellarYears} ani`,
      points: bonus,
    },
  };
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
 * Estimeaza bonusul de potential la invechire (+3 .. +6) pentru formula v1.
 * tasteProfile (proza AI) nu intra niciodata in calcul. cellarPotential
 * intra doar daca este marcat verificat, nu estimarea generica pret/categorie.
 */
function calculateAgingPotentialBonus(input: {
  wineType?: string;
  cellarPotential?: number | null;
  cellarPotentialVerified?: boolean;
  acidity?: number | null;
  tasteProfile?: string | null;
}): number {
  const wineType = normalizeCategory(input.wineType ?? "");
  const isRed = wineType === "rosu" || wineType === "red";
  const cellarYears =
    input.cellarPotentialVerified === true ? (input.cellarPotential ?? 0) : 0;

  if (cellarYears >= 10) return 6;
  if (cellarYears >= 6) return 5;
  if (cellarYears >= 4) return 4;
  if (cellarYears >= 2) return 3;
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

function toVinIntelScoreInput(wine: ValueScoreInput): VinIntelScoreInput {
  return {
    price: wine.price,
    grapeVarieties: wine.grapeVarieties,
    region: wine.region,
    wineryName: wine.wineryName,
    wineType: wine.wineType,
    cellarPotential: wine.cellarPotential,
    cellarPotentialVerified: wine.cellarPotentialVerified,
    acidity: wine.acidity,
    tasteProfile: wine.tasteProfile,
    wineMedals: wine.wineMedals,
    criticScore: wine.criticScore,
    vintage: wine.vintage,
    ratingAvg: wine.ratingAvg,
    communityScore: wine.communityScore,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
    referenceYear: wine.referenceYear,
  };
}

export interface ValueScoreBatchContext {
  peerPriors?: Map<string, number>;
  expectedCurves?: Map<string, { intercept: number; logSlope: number }>;
}

/**
 * Value Score VinIntel v2: calitate intrinseca + eficienta pret.
 */
export function calculateValueScore(
  wine: ValueScoreInput,
  batchContext?: ValueScoreBatchContext,
): number {
  return buildValueScoreBreakdown(wine, batchContext).finalScore;
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
  version?: number;
  scoreMin?: number;
  scoreMax?: number;
  quality?: number;
  priceEfficiency?: number;
  expectedQualityAtPrice?: number;
  qualityConfidence?: number;
  confidencePercent?: number;
  confidenceScoreCeiling?: number;
  confidenceLabel?: string;
  provisional?: boolean;
}

/**
 * Transparent breakdown of VinIntel Score factors for UI display.
 */
export function buildValueScoreBreakdown(
  wine: ValueScoreInput,
  batchContext?: ValueScoreBatchContext,
): ValueScoreBreakdown {
  const result = calculateVinIntelScore(toVinIntelScoreInput(wine), {
    peerPriors: batchContext?.peerPriors,
    expectedCurves: batchContext?.expectedCurves,
  });

  const scoreMin = Math.max(35, result.quality - 20);
  const scoreMax = Math.min(97, result.quality + 8);

  return {
    items: result.items,
    subtotal: Math.round(result.rawScore),
    penaltyNote: result.provisional
      ? "Scor provizoriu: date insuficiente pentru o estimare stabila a calitatii."
      : null,
    finalScore: result.valueScore,
    version: VALUE_SCORE_ALGORITHM_VERSION,
    scoreMin,
    scoreMax,
    quality: result.quality,
    priceEfficiency: result.priceEfficiency,
    expectedQualityAtPrice: result.expectedQualityAtPrice,
    qualityConfidence: result.qualityConfidence,
    confidencePercent: result.confidencePercent,
    confidenceScoreCeiling: result.confidenceScoreCeiling,
    confidenceLabel: result.confidenceLabel,
    provisional: result.provisional,
  };
}

/** Formula aditiva v1 (legacy, doar pentru audit/comparatie). */
export function buildValueScoreV1Breakdown(
  wine: ValueScoreInput,
): ValueScoreBreakdown {
  const baseQuality = resolveBaseQuality(wine);
  const enriched: ValueScoreInput = { ...wine, baseQuality };
  const items: ValueScoreBreakdownItem[] = [];
  let score = 0;

  const qualityPoints = baseQuality * 0.43;
  score += qualityPoints;
  items.push({
    label: "Calitate de baza",
    detail: `${baseQuality}/100 x 43%`,
    points: Math.round(qualityPoints * 10) / 10,
  });

  const priceEfficiency = Math.max(0, baseQuality - wine.price / 4);
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

  const worldClassBonus = calculateWorldClassPotentialBonus(enriched);
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

  const vintageBonus = calculateVintageBonus(enriched);
  if (vintageBonus.bonus > 0 && vintageBonus.item) {
    score += vintageBonus.bonus;
    items.push(vintageBonus.item);
  }

  const subtotal = Math.round(score);
  const bounds = dynamicScoreBounds(baseQuality);
  const finalScore = clampScore(score, bounds.min, bounds.max);

  if (finalScore !== subtotal) {
    items.push({
      label: "Plafonare dinamica",
      detail: `Interval ${bounds.min}-${bounds.max} (baza calitate ${baseQuality})`,
      points: finalScore - subtotal,
    });
  }

  return {
    items,
    subtotal,
    penaltyNote,
    finalScore,
    version: 1,
    scoreMin: bounds.min,
    scoreMax: bounds.max,
    quality: baseQuality,
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
    baseQuality: wine.estimatedQuality ?? defaultBaseQuality(price),
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
  const { price, category, sweetness, grapeVarieties } = input;
  const cat = normalizeCategory(category);

  const valueScore = calculateValueScore({
    price,
    isAutochthonous: isAutochthonousGrapeMix(grapeVarieties),
    region: input.region ?? "",
    baseQuality: input.baseQuality ?? defaultBaseQuality(price),
    wineMedals: input.wineMedals,
    criticScore: input.criticScore,
    grapeVarieties,
    wineryName: input.wineryName,
    wineType: cat,
    cellarPotential: input.cellarPotential,
    acidity: input.acidity,
    tasteProfile: input.tasteProfile,
  });

  const gift = calculateGiftScore({
    price,
    type: cat,
    grapeVarieties,
    region: input.region,
    wineryName: input.wineryName,
    vintage: input.vintage,
    valueScore: input.valueScore ?? valueScore,
    estimatedQuality: input.estimatedQuality ?? input.baseQuality,
    qualityFinal: input.qualityFinal,
    medals: input.wineMedals,
    criticScore: input.criticScore,
    ratingAvg: input.ratingAvg,
    communityScore: input.communityScore,
    producerPageUrl: input.producerPageUrl,
    tastingSheetUrl: input.tastingSheetUrl,
    alcohol: input.alcohol,
    sweetness,
  });

  const food = calculateFoodVersatility({
    type: cat,
    sweetness,
    acidity: input.acidity,
    foodPairings: input.foodPairings,
    producerCulinaryPairings: input.producerCulinaryPairings,
  });

  return {
    valueScore,
    giftScore: gift.score,
    foodMatchScore: food.score,
    overpricedRisk: inferOverpricedRisk(price, valueScore),
    beginnerFriendly: valueScore >= 70 && price <= 65,
    cellarPotential: input.cellarPotential ?? null,
  };
}
