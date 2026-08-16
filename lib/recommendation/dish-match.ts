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
  categorizeFoodText,
  foodCategoryLabel,
  isDessertCategory,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import type { FoodPairing, ProducerPageContent } from "@/lib/schema";
import type { DishMatchResult } from "@/lib/recommendation/types";

export interface DishMatchWine {
  type?: string | null;
  sweetness?: string | null;
  acidity?: number | null;
  foodPairings?: FoodPairing[] | null;
  producerContent?: ProducerPageContent | null;
}

const GENERIC_TYPE_FIT: Record<string, Partial<Record<FoodCategoryId, number>>> = {
  red: {
    sarmale: 72,
    grilled_meat: 78,
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

function pairingHitsDish(pairingDish: string, dish: string, categories: FoodCategoryId[]): boolean {
  const pairingNorm = pairingDish
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const dishNorm = dish
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (pairingNorm.includes(dishNorm) || dishNorm.includes(pairingNorm)) return true;
  const pairingCats = categorizeFoodText(pairingDish);
  return pairingCats.some((category) => categories.includes(category));
}

export function scoreWineForDish(wine: DishMatchWine, dish: string): DishMatchResult {
  const categories = resolveTargetCategories(dish);
  const type = normalizeType(wine.type);
  const reasons: string[] = [];

  const curatedHit = (wine.foodPairings ?? []).some((pairing) =>
    pairingHitsDish(pairing.dish, dish, categories),
  );
  if (curatedHit) {
    reasons.push(`Pairing structurat pentru ${dish}.`);
    return {
      score: 90,
      confidence: 86,
      reasons,
      evidenceLevel: 1,
      categoryMatched: true,
    };
  }

  const producerText = wine.producerContent?.culinaryPairings ?? "";
  const producerCategories = producerText ? categorizeFoodText(producerText) : [];
  const producerHitsDish =
    Boolean(producerText) && pairingHitsDish(producerText, dish, categories);
  const producerIsLaundryList = producerCategories.length >= 4;
  const dessertTarget = categories.some(isDessertCategory);
  const dessertFriendly =
    wine.type === "dessert" ||
    wine.sweetness === "dulce" ||
    wine.sweetness === "demidulce" ||
    wine.sweetness === "demisec";
  if (
    producerHitsDish &&
    !producerIsLaundryList &&
    (!dessertTarget || dessertFriendly)
  ) {
    reasons.push("Producatorul mentioneaza aceasta asociere culinara.");
    return {
      score: 82,
      confidence: 74,
      reasons,
      evidenceLevel: 2,
      categoryMatched: true,
    };
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

  if (styleSupported && acidityKnown) {
    reasons.push(
      `Stil verificat (${type}${wine.sweetness ? `, ${wine.sweetness}` : ""}) pentru ${foodCategoryLabel(primary)}.`,
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
