/**
 * Motor comun de potrivire vin-fel.
 *
 * Prioritate evidenta:
 * 1. pairing structurat curat pentru fel/categorie
 * 2. asocieri culinare explicite de la producator
 * 3. date de stil verificate (tip + dulceata + aciditate)
 * 4. compatibilitate generica tip + dulceata
 *
 * Compatibilitatea generica nu se prezinta ca evidenta de degustare a sticlei.
 */
import {
  isCulinaryChromeText,
  isTastingNoteLeak,
  sanitizeCulinaryText,
} from "@/lib/culinary-extract";
import { isLaundryListText } from "@/lib/food-evidence";
import {
  categorizeFoodText,
  foodCategoryLabel,
  isDessertCategory,
  isGrillCategory,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import {
  findRomanianDishByName,
  foldDishName,
} from "@/lib/pairing/romanian-dishes";
import { isExactOrNearExactProducerMention } from "@/lib/pairing/producer-provenance";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import type { FoodPairing, ProducerPageContent } from "@/lib/schema";
import type { DishMatchResult } from "@/lib/recommendation/types";

export interface DishMatchWine {
  type?: string | null;
  sweetness?: string | null;
  acidity?: number | null;
  foodPairings?: FoodPairing[] | null;
  producerContent?: ProducerPageContent | null;
  sweetnessTrust?: "verified" | "catalog_only" | "conflicting" | "unknown";
}

const GENERIC_TYPE_FIT: Record<string, Partial<Record<FoodCategoryId, number>>> = {
  red: {
    sarmale: 72,
    grilled_meat: 78,
    grilled_fish: 36,
    grilled_vegetable: 40,
    pork: 74,
    beef: 80,
    poultry: 58,
    festive_traditional: 70,
    cheese: 62,
    pasta: 60,
    pizza: 64,
    vegetable: 40,
    fish: 28,
    dessert: 22,
    chocolate: 30,
  },
  white: {
    fish: 80,
    poultry: 70,
    cheese: 64,
    pasta: 66,
    vegetable: 72,
    grilled_fish: 82,
    grilled_vegetable: 74,
    pizza: 50,
    festive_traditional: 48,
    sarmale: 34,
    grilled_meat: 32,
    pork: 40,
    beef: 28,
    dessert: 36,
    chocolate: 24,
  },
  rose: {
    grilled_meat: 62,
    grilled_fish: 58,
    grilled_vegetable: 60,
    pork: 58,
    poultry: 66,
    pizza: 70,
    pasta: 64,
    cheese: 60,
    vegetable: 58,
    festive_traditional: 52,
    sarmale: 40,
    fish: 56,
    beef: 42,
    dessert: 30,
    chocolate: 22,
  },
  sparkling: {
    cheese: 70,
    festive_traditional: 68,
    fish: 64,
    poultry: 60,
    vegetable: 58,
    pizza: 56,
    pasta: 54,
    dessert: 48,
    chocolate: 36,
    grilled_meat: 40,
    grilled_fish: 62,
    grilled_vegetable: 56,
    pork: 42,
    sarmale: 34,
    beef: 32,
  },
  dessert: {
    dessert: 88,
    chocolate: 84,
    festive_traditional: 60,
    cheese: 54,
    sarmale: 18,
    grilled_meat: 16,
    grilled_fish: 18,
    grilled_vegetable: 20,
    pork: 18,
    beef: 16,
    poultry: 22,
    fish: 20,
    pasta: 24,
    pizza: 22,
    vegetable: 20,
  },
  orange: {
    cheese: 68,
    festive_traditional: 56,
    poultry: 52,
    vegetable: 50,
    pasta: 48,
    grilled_meat: 46,
    grilled_fish: 38,
    grilled_vegetable: 48,
    pork: 46,
    sarmale: 42,
    fish: 36,
    dessert: 28,
    chocolate: 24,
    pizza: 44,
    beef: 44,
  },
};

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
  return value || "unknown";
}

function sweetnessAdjust(
  sweetness: string | null | undefined,
  category: FoodCategoryId,
): number {
  const sweet = (sweetness ?? "").toLowerCase();
  if (isDessertCategory(category)) {
    if (sweet === "dulce") return 16;
    if (sweet === "demidulce") return 12;
    if (sweet === "demisec") return 6;
    if (sweet === "sec") return -18;
    return 0;
  }
  if (sweet === "dulce") return -16;
  if (sweet === "demidulce") return -10;
  if (sweet === "demisec") return -4;
  return 0;
}

function resolveTargetCategories(dish: string): FoodCategoryId[] {
  const categories = categorizeFoodText(dish);
  if (categories.length > 0) return categories;
  return [];
}

export function dishMatchSpecificity(
  pairingDish: string,
  dish: string,
  categories = resolveTargetCategories(dish),
): 0 | 1 | 2 | 3 | 4 {
  const pairingNorm = foldDishName(pairingDish);
  const dishNorm = foldDishName(dish);
  if (pairingNorm && pairingNorm === dishNorm) return 4;

  const pairingProfile = findRomanianDishByName(pairingDish);
  const dishProfile = findRomanianDishByName(dish);
  if (pairingProfile && dishProfile) {
    if (pairingProfile.id === dishProfile.id) return 4;
    if (pairingProfile.family === dishProfile.family) return 2;
    if (pairingProfile.foodCategory === dishProfile.foodCategory) return 1;
  }

  const pairingCats = categorizeFoodText(pairingDish);
  return pairingCats.some((category) => categories.includes(category)) ? 1 : 0;
}

function producerMentionsExactDish(producerText: string, dish: string): boolean {
  const foldedDish = foldDishName(dish);
  return producerText
    .split(/[,;.]+/)
    .some((mention) => {
      const foldedMention = foldDishName(mention);
      const direct =
        foldedMention === foldedDish ||
        (foldedDish.split(" ").length >= 2 &&
          foldedMention.includes(foldedDish));
      return direct || isExactOrNearExactProducerMention(mention, dish);
    });
}

function isFocusedDessertRecommendation(text: string): boolean {
  const cats = categorizeFoodText(text);
  const dessertCats = cats.filter(isDessertCategory);
  if (dessertCats.length === 0) return false;
  if (isLaundryListText(text) || isTastingNoteLeak(text) || isCulinaryChromeText(text)) {
    return false;
  }
  return cats.length <= 2;
}

function producerTextIsUsable(text: string): boolean {
  if (!text.trim()) return false;
  if (isCulinaryChromeText(text) || isTastingNoteLeak(text)) return false;
  if (isLaundryListText(text)) return false;
  return true;
}

export function hasUnsafeCulinaryRecommendationText(
  wine: DishMatchWine,
): boolean {
  const text = wine.producerContent?.culinaryPairings ?? "";
  return (
    isCulinaryChromeText(text) ||
    isTastingNoteLeak(text) ||
    isLaundryListText(text)
  );
}

export function scoreWineForDish(wine: DishMatchWine, dish: string): DishMatchResult {
  const categories = resolveTargetCategories(dish);
  const type = normalizeType(wine.type);
  const reasons: string[] = [];

  const bestCuratedSpecificity = (wine.foodPairings ?? []).reduce(
    (best, pairing) =>
      Math.max(best, dishMatchSpecificity(pairing.dish, dish, categories)),
    0,
  );
  if (bestCuratedSpecificity > 0) {
    const exact = bestCuratedSpecificity >= 3;
    reasons.push(
      exact
        ? `Asociere evaluată exact pentru ${dish}.`
        : bestCuratedSpecificity === 2
          ? `Asociere evaluată pentru un preparat apropiat din aceeași familie.`
          : `Asociere evaluată doar la nivelul categoriei culinare.`,
    );
    const dessertTarget = categories.some(isDessertCategory);
    const trustedSweetness = wine.sweetnessTrust === "verified";
    const dessertCompatible =
      wine.type === "dessert" ||
      wine.sweetness === "dulce" ||
      wine.sweetness === "demidulce";
    const confidence =
      dessertTarget && (!trustedSweetness || !dessertCompatible)
        ? 38
        : exact
          ? 88
          : bestCuratedSpecificity === 2
            ? 64
            : 48;
    return {
      score:
        dessertTarget && (!trustedSweetness || !dessertCompatible)
          ? 52
          : exact
            ? 90
            : bestCuratedSpecificity === 2
              ? 72
              : 58,
      confidence,
      reasons,
      evidenceLevel: 1,
      categoryMatched: true,
    };
  }

  const producerText = sanitizeCulinaryText(wine.producerContent?.culinaryPairings);
  const producerCategories = producerText ? categorizeFoodText(producerText) : [];
  const dessertTarget = categories.some(isDessertCategory);
  const dessertWine =
    wine.type === "dessert" ||
    wine.sweetness === "dulce" ||
    wine.sweetness === "demidulce";
  const producerUsable = producerTextIsUsable(producerText);
  const producerExact =
    producerUsable && producerMentionsExactDish(producerText, dish);
  const producerGrillRelated =
    producerUsable &&
    categories.some(isGrillCategory) &&
    producerCategories.some(isGrillCategory) &&
    !producerExact;

  if (dessertTarget && producerUsable && isFocusedDessertRecommendation(producerText)) {
    const trustworthySweetness = wine.sweetnessTrust === "verified";
    if (
      producerExact ||
      (trustworthySweetness &&
        (dessertWine || wine.sweetness === "demisec"))
    ) {
      reasons.push("Recomandare culinara oficiala, concentrata pe desert.");
      return {
        score: producerExact ? 82 : dessertWine ? 78 : 68,
        confidence: producerExact ? 74 : dessertWine ? 68 : 56,
        reasons,
        evidenceLevel: 2,
        categoryMatched: true,
      };
    }
  }

  if (producerExact && !dessertTarget) {
    reasons.push("Producatorul mentioneaza aceasta asociere culinara.");
    return {
      score: 82,
      confidence: 74,
      reasons,
      evidenceLevel: 2,
      categoryMatched: true,
    };
  }

  if (producerGrillRelated) {
    reasons.push(
      "Producătorul recomandă alt tip de grătar; folosim doar compatibilitatea generală de stil.",
    );
  }

  if (categories.length === 0) {
    return {
      score: 42,
      confidence: 28,
      reasons: ["Felul nu e in taxonomia VinIntel; potrivire slaba."],
      evidenceLevel: 4,
      categoryMatched: false,
    };
  }

  const primary = categories[0];
  const generic = GENERIC_TYPE_FIT[type]?.[primary] ?? 40;
  const adjusted = clamp(generic + sweetnessAdjust(wine.sweetness, primary), 12, 88);
  const acidityKnown = wine.acidity != null;
  const styleSupported =
    acidityKnown || Boolean(wine.sweetness && wine.type);

  const dessertIdentityCompatible =
    type === "dessert" ||
    wine.sweetness === "dulce" ||
    wine.sweetness === "demidulce";
  if (
    dessertTarget &&
    (wine.sweetnessTrust !== "verified" || !dessertIdentityCompatible)
  ) {
    return {
      score: Math.min(
        roundScore(adjusted),
        wine.sweetness === "sec" ? 30 : 46,
      ),
      confidence: 30,
      reasons: [
        wine.sweetnessTrust !== "verified"
          ? "Dulceața vinului nu este verificată pentru o recomandare sigură de desert."
          : "Stilul de dulceață verificat nu este potrivit pentru o recomandare sigură de desert.",
      ],
      evidenceLevel: 4,
      categoryMatched: true,
    };
  }

  if (styleSupported && acidityKnown) {
    reasons.push(
      `Compatibilitate estimată pentru un vin de tip ${type} și ${foodCategoryLabel(primary)}.`,
    );
    return {
      score: roundScore(clamp(adjusted + 4, 12, 84)),
      confidence: 58,
      reasons,
      evidenceLevel: 3,
      categoryMatched: true,
    };
  }

  reasons.push(
    `Compatibilitate generica de stil pentru ${foodCategoryLabel(primary)}, nu evidenta de sticla.`,
  );
  return {
    score: roundScore(adjusted),
    confidence: wine.sweetness ? 42 : 30,
    reasons,
    evidenceLevel: 4,
    categoryMatched: true,
  };
}

export function scoreWineForDessert(wine: DishMatchWine): DishMatchResult {
  return scoreWineForDish(wine, "desert");
}
