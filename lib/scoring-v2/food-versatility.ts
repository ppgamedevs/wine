/**
 * Food Versatility v2 (stocat in coloana legacy foodMatchScore).
 *
 * Intrebare: "Cat de versatil este vinul acesta la masa?"
 * NU inseamna "cat de bine merge cu sarmale".
 *
 * Nu foloseste: foodPairingNotes editoriale, tasteProfile, sugestii AI,
 * taninuri/aciditate inventate, numar de paragrafe generate.
 */
import { sanitizeCulinaryText } from "@/lib/culinary-extract";
import {
  classifyCuratedPairings,
  evidenceContextFromPairingFields,
} from "@/lib/curated-evidence";
import {
  assessFoodEvidence,
  evidenceClassWeight,
  type FoodEvidenceClaim,
  type FoodEvidenceLevel,
} from "@/lib/food-evidence";
import {
  categorizeFoodItems,
  isDessertCategory,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import { FOOD_VERSATILITY_ALGORITHM_VERSION } from "@/lib/scoring-v2/constants";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import type { FoodPairing } from "@/lib/schema";

export const FOOD_CONFIDENCE_CEILINGS = [
  { minConfidencePercent: 80, maxScore: 94 },
  { minConfidencePercent: 65, maxScore: 88 },
  { minConfidencePercent: 50, maxScore: 80 },
  { minConfidencePercent: 35, maxScore: 72 },
  { minConfidencePercent: 0, maxScore: 62 },
] as const;

export interface FoodVersatilityInput {
  type?: string | null;
  sweetness?: string | null;
  acidity?: number | null;
  alcohol?: number | null;
  foodPairings?: FoodPairing[] | null;
  producerCulinaryPairings?: string | null;
  tastingSheetCulinaryPairings?: string | null;
  foodEvidence?: FoodEvidenceClaim[] | null;
  culinaryChromeRejected?: boolean;
  culinaryLaundryRejected?: boolean;
}

export interface FoodVersatilityBreakdownItem {
  key: string;
  label: string;
  points: number;
  detail: string;
}

export interface FoodVersatilityResult {
  score: number;
  confidence: number;
  provisional: boolean;
  displayable: boolean;
  evidenceLevel: FoodEvidenceLevel;
  evidenceProvenance: "source_backed" | "structured" | "editorial" | "style";
  algorithmVersion: typeof FOOD_VERSATILITY_ALGORITHM_VERSION;
  categories: FoodCategoryId[];
  breakdown: FoodVersatilityBreakdownItem[];
}

function normalizeType(type: string | null | undefined): string {
  const value = (type ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (value === "rosu" || value === "red") return "red";
  if (value === "alb" || value === "white") return "white";
  if (value === "roze" || value === "rose") return "rose";
  if (value === "spumant" || value === "sparkling") return "sparkling";
  if (value === "desert" || value === "dessert" || value === "dulce") {
    return "dessert";
  }
  if (value === "orange") return "orange";
  return value;
}

function collectCategories(input: FoodVersatilityInput): {
  curated: FoodCategoryId[];
  sourceBacked: FoodCategoryId[];
  structured: FoodCategoryId[];
  editorial: FoodCategoryId[];
  producer: FoodCategoryId[];
  tasting: FoodCategoryId[];
  all: FoodCategoryId[];
  laundryListRejected: boolean;
  chromeRejected: boolean;
  evidenceLevel: FoodEvidenceLevel;
  displayable: boolean;
} {
  const assessment = assessFoodEvidence({
    foodPairings: input.foodPairings,
    curatedDishes: (input.foodPairings ?? []).map((pairing) => pairing.dish),
    producerCulinary: sanitizeCulinaryText(input.producerCulinaryPairings),
    tastingSheetCulinary: input.tastingSheetCulinaryPairings,
    foodEvidence: input.foodEvidence,
    type: input.type,
    sweetness: input.sweetness,
    alcohol: input.alcohol,
    acidity: input.acidity,
    chromeRejected: input.culinaryChromeRejected,
    laundryRejected: input.culinaryLaundryRejected,
  });

  const claimCategories = (input.foodEvidence ?? [])
    .filter(
      (claim) =>
        evidenceClassWeight(claim.evidenceClass) >=
        evidenceClassWeight("PRODUCER_EXACT"),
    )
    .map((claim) => claim.category);

  const context = evidenceContextFromPairingFields({
    type: input.type,
    sweetness: input.sweetness,
    alcohol: input.alcohol,
    acidity: input.acidity,
    producerCulinaryPairings: input.producerCulinaryPairings,
    foodEvidence: input.foodEvidence,
    culinaryLaundryRejected: input.culinaryLaundryRejected,
    culinaryChromeRejected: input.culinaryChromeRejected,
  });
  const tiers = classifyCuratedPairings(input.foodPairings, context);

  const curated =
    assessment.curatedCategories.length > 0
      ? assessment.curatedCategories
      : categorizeFoodItems((input.foodPairings ?? []).map((pairing) => pairing.dish));
  const producer = assessment.producerCategories;
  const tasting = assessment.tastingSheetCategories;
  const all = [...new Set([...curated, ...producer, ...tasting, ...claimCategories])];

  return {
    curated,
    sourceBacked: tiers.sourceBacked,
    structured: tiers.structured,
    editorial: tiers.editorial,
    producer,
    tasting,
    all,
    laundryListRejected: assessment.laundryListRejected,
    chromeRejected: assessment.chromeRejected,
    evidenceLevel: assessment.evidenceLevel,
    displayable: assessment.displayable,
  };
}

function breadthScore(effectiveCount: number): number {
  if (effectiveCount <= 0) return 40;
  if (effectiveCount < 1) return Math.round(40 + 16 * effectiveCount);
  if (effectiveCount < 2) return Math.round(56 + 12 * (effectiveCount - 1));
  if (effectiveCount < 3) return Math.round(68 + 10 * (effectiveCount - 2));
  if (effectiveCount < 4) return Math.round(78 + 8 * (effectiveCount - 3));
  return Math.min(92, Math.round(86 + 6 * (effectiveCount - 4)));
}

function effectiveBreadth(input: {
  all: FoodCategoryId[];
  sourceBacked: FoodCategoryId[];
  structured: FoodCategoryId[];
  editorial: FoodCategoryId[];
  producer: FoodCategoryId[];
  tasting: FoodCategoryId[];
}): number {
  let total = 0;
  for (const category of input.all) {
    if (input.sourceBacked.includes(category) || input.producer.includes(category) || input.tasting.includes(category)) {
      total += 1;
    } else if (input.structured.includes(category)) {
      total += 0.6;
    } else if (input.editorial.includes(category)) {
      total += 0.45;
    } else {
      total += 1;
    }
  }
  return total;
}

function styleUtility(type: string, sweetness: string | null | undefined): {
  score: number;
  detail: string;
  generic: boolean;
} {
  const sweet = (sweetness ?? "").toLowerCase();
  const isSweet = sweet === "dulce" || sweet === "demidulce";
  const isOffDry = sweet === "demisec";
  const sweetnessKnown = Boolean(sweet);

  if (type === "dessert" || isSweet) {
    return {
      score: 36,
      detail: "Vin dulce: util la desert, ingust la masa savuroasa.",
      generic: !sweetnessKnown && type === "dessert",
    };
  }

  if (type === "white" && (sweet === "sec" || !sweetnessKnown)) {
    return {
      score: sweetnessKnown ? 64 : 58,
      detail: sweetnessKnown
        ? "Alb sec: utilitate de masa relativ larga (generic, incredere mica)."
        : "Alb, dulceata necunoscuta: baseline generic slab.",
      generic: true,
    };
  }
  if (type === "rose" && (sweet === "sec" || !sweetnessKnown)) {
    return {
      score: sweetnessKnown ? 62 : 56,
      detail: "Roze: utilitate de masa moderata, semnal generic.",
      generic: true,
    };
  }
  if (type === "sparkling") {
    return {
      score: isOffDry ? 60 : 64,
      detail: "Spumant: merge cu multe mese usoare, semnal generic.",
      generic: true,
    };
  }
  if (type === "red") {
    return {
      score: isOffDry ? 48 : 50,
      detail: "Rosu singur nu inseamna versatilitate. Baseline scazut.",
      generic: true,
    };
  }
  if (type === "orange") {
    return { score: 48, detail: "Orange: masa mai ingusta, baseline modest.", generic: true };
  }
  if (isOffDry) {
    return { score: 50, detail: "Demisec: utilitate mixtă, nici larga nici nula.", generic: true };
  }
  return { score: 46, detail: "Stil necunoscut, prior conservator.", generic: true };
}

function acidityBonus(
  type: string,
  acidity: number | null | undefined,
): { bonus: number; known: boolean } {
  if (acidity == null || !Number.isFinite(acidity)) {
    return { bonus: 0, known: false };
  }
  if ((type === "white" || type === "rose" || type === "sparkling") && acidity >= 5.5) {
    return { bonus: 8, known: true };
  }
  if (type === "red" && acidity >= 5.2) {
    return { bonus: 4, known: true };
  }
  return { bonus: 0, known: true };
}

function dessertComponent(
  type: string,
  sweetness: string | null | undefined,
  categories: FoodCategoryId[],
): number {
  const sweet = (sweetness ?? "").toLowerCase();
  const dessertEvidence = categories.some(isDessertCategory);
  if (type === "dessert" || sweet === "dulce" || sweet === "demidulce") {
    return dessertEvidence ? 78 : 70;
  }
  if (dessertEvidence) return 64;
  return 48;
}

function foodConfidence(
  input: FoodVersatilityInput,
  sourceBacked: FoodCategoryId[],
  structured: FoodCategoryId[],
  editorial: FoodCategoryId[],
  producer: FoodCategoryId[],
  tasting: FoodCategoryId[],
): number {
  let confidence = 12;
  if (input.type) confidence += 8;
  if (input.sweetness) confidence += 8;
  if (input.acidity != null) confidence += 10;
  if (producer.length > 0) confidence += Math.min(16, 8 + producer.length * 4);
  if (tasting.length > 0) confidence += Math.min(12, 6 + tasting.length * 3);

  const sourceOnly = sourceBacked.filter((category) => !producer.includes(category) && !tasting.includes(category));
  const structuredOnly = structured.filter(
    (category) =>
      !sourceBacked.includes(category) &&
      !producer.includes(category) &&
      !tasting.includes(category),
  );
  const editorialOnly = editorial.filter(
    (category) =>
      !sourceBacked.includes(category) &&
      !structured.includes(category) &&
      !producer.includes(category) &&
      !tasting.includes(category),
  );
  if (sourceOnly.length > 0) confidence += Math.min(20, 8 + sourceOnly.length * 4);
  if (structuredOnly.length > 0) confidence += Math.min(12, 6 + structuredOnly.length * 2);
  if (editorialOnly.length > 0) confidence += Math.min(8, 4 + editorialOnly.length);
  if (sourceBacked.some((category) => producer.includes(category) || tasting.includes(category))) {
    confidence += 4;
  }

  if (
    sourceBacked.length === 0 &&
    structured.length === 0 &&
    editorial.length === 0 &&
    producer.length === 0 &&
    tasting.length === 0
  ) {
    confidence = Math.min(confidence, 38);
  }
  return clamp(Math.round(confidence), 10, 94);
}

function resolveFoodCeiling(confidencePercent: number): number {
  for (const row of FOOD_CONFIDENCE_CEILINGS) {
    if (confidencePercent >= row.minConfidencePercent) return row.maxScore;
  }
  return 62;
}

export function calculateFoodVersatility(
  input: FoodVersatilityInput,
): FoodVersatilityResult {
  const type = normalizeType(input.type);
  const collected = collectCategories(input);
  const {
    curated,
    sourceBacked,
    structured,
    editorial,
    producer,
    tasting,
    all,
    evidenceLevel,
    displayable,
  } = collected;
  const style = styleUtility(type, input.sweetness);
  const acid = acidityBonus(type, input.acidity);
  const styleScore = clamp(style.score + acid.bonus, 20, 80);
  const breadth = breadthScore(
    effectiveBreadth({ all, sourceBacked, structured, editorial, producer, tasting }),
  );
  const dessert = dessertComponent(type, input.sweetness, all);

  const sourceOnly = sourceBacked.filter((category) => !producer.includes(category) && !tasting.includes(category));
  const structuredOnly = structured.filter(
    (category) => !sourceBacked.includes(category) && !producer.includes(category) && !tasting.includes(category),
  );
  const editorialOnly = editorial.filter(
    (category) =>
      !sourceBacked.includes(category) &&
      !structured.includes(category) &&
      !producer.includes(category) &&
      !tasting.includes(category),
  );
  const overlapApproval = sourceBacked.some(
    (category) => producer.includes(category) || tasting.includes(category),
  )
    ? 4
    : 0;

  const evidenceQuality = clamp(
    28 +
      Math.min(24, sourceOnly.length * 12) +
      Math.min(15, structuredOnly.length * 5) +
      Math.min(9, editorialOnly.length * 3) +
      overlapApproval +
      producer.length * 6 +
      tasting.length * 5 +
      (input.acidity != null ? 10 : 0) +
      (input.sweetness ? 8 : 0) +
      (input.type ? 6 : 0),
    20,
    90,
  );
  const confidence = foodConfidence(
    input,
    sourceBacked,
    structured,
    editorial,
    producer,
    tasting,
  );
  const evidenceProvenance =
    sourceBacked.length > 0 || producer.length > 0 || tasting.length > 0
      ? "source_backed"
      : structured.length > 0
        ? "structured"
        : editorial.length > 0 || curated.length > 0
          ? "editorial"
          : "style";

  const breadthWeight = all.length > 0 ? 0.45 : 0.2;
  const styleWeight = all.length > 0 ? 0.25 : 0.45;
  const evidenceWeight = 0.2;
  const dessertWeight = 0.1;

  const raw =
    breadth * breadthWeight +
    styleScore * styleWeight +
    evidenceQuality * evidenceWeight +
    dessert * dessertWeight;

  const ceiling = resolveFoodCeiling(confidence);
  let score = roundScore(clamp(raw, 22, ceiling));

  if (score >= 90 && (all.length < 3 || confidence < 60)) {
    score = Math.min(score, 87);
  }

  const breakdown: FoodVersatilityBreakdownItem[] = [
    {
      key: "breadth",
      label: "Latime categorii",
      points: breadth,
      detail:
        all.length === 0
          ? "Fara pairing-uri structurate. Nu recompensam aliasuri repetate."
          : `${all.length} categorii (sursa ${sourceBacked.length}, stil ${structured.length}, editorial ${editorial.length}, producator ${producer.length}).`,
    },
    {
      key: "style",
      label: "Utilitate de stil",
      points: styleScore,
      detail: acid.known
        ? `${style.detail} Aciditate verificata ${input.acidity} g/L.`
        : `${style.detail} Aciditate necunoscuta, fara pretentie.`,
    },
    {
      key: "evidence",
      label: "Calitatea evidentiilor",
      points: evidenceQuality,
      detail: "Calitatea evidentiilor tine de baza (producator/stil/editorial), nu de strength.",
    },
    {
      key: "dessert",
      label: "Utilitate desert",
      points: dessert,
      detail: "Doar dulceata/tip/pairing factual, nu lista editoriala de desert.",
    },
  ];

  return {
    score,
    confidence,
    provisional:
      !displayable ||
      confidence < 45 ||
      evidenceProvenance === "editorial" ||
      evidenceProvenance === "structured" ||
      (style.generic && all.length === 0),
    displayable,
    evidenceLevel,
    evidenceProvenance,
    algorithmVersion: FOOD_VERSATILITY_ALGORITHM_VERSION,
    categories: all,
    breakdown,
  };
}
