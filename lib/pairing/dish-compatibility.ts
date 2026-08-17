/**
 * Deterministic dish compatibility. Compatibility first, discovery second.
 */
import type { FoodCategoryId } from "@/lib/food-taxonomy";
import type { RomanianDishProfile } from "@/lib/pairing/romanian-dishes";
import {
  producerMentionsCategory,
  producerMentionsDish,
  type WinePairingProfile,
} from "@/lib/pairing/wine-pairing-profile";

export interface DishCompatibilityResult {
  dish: RomanianDishProfile;
  score: number;
  exactProducer: boolean;
  categoryProducer: boolean;
}

const DESSERT_CATEGORIES = new Set<FoodCategoryId>(["dessert", "chocolate"]);

function sweetnessAllowsDessert(profile: WinePairingProfile): boolean {
  return (
    profile.sweetness === "demidulce" ||
    profile.sweetness === "dulce" ||
    profile.type === "dessert" ||
    (profile.sugar != null && profile.sugar >= 20)
  );
}

function proteinAffinity(
  profile: WinePairingProfile,
  dish: RomanianDishProfile,
): number {
  const style = profile.style;
  if (dish.protein === "duck") return style.duckAffinity;
  if (dish.protein === "rabbit") return style.rabbitAffinity;
  if (dish.protein === "lamb") return style.lambAffinity;
  if (dish.protein === "fish" || dish.protein === "seafood") {
    return style.fishAffinity;
  }
  if (
    dish.protein === "pork" ||
    dish.protein === "beef" ||
    dish.protein === "game"
  ) {
    return style.meatAffinity;
  }
  if (dish.protein === "chicken" || dish.protein === "turkey") {
    return Math.max(style.meatAffinity - 1, style.creamyAffinity);
  }
  return 3;
}

export function scoreDishCompatibility(
  profile: WinePairingProfile,
  dish: RomanianDishProfile,
): DishCompatibilityResult {
  let score = 50;
  const exactProducer = producerMentionsDish(profile, dish.name, dish.aliases);
  const categoryProducer = producerMentionsCategory(profile, dish.foodCategory);

  if (DESSERT_CATEGORIES.has(dish.foodCategory)) {
    if (!sweetnessAllowsDessert(profile) && !exactProducer) {
      return { dish, score: 0, exactProducer, categoryProducer };
    }
    score += profile.style.sweetAffinity * 6;
    if (profile.sweetness === "sec") score -= 40;
  } else if (sweetnessAllowsDessert(profile) && profile.type !== "rose") {
    score -= 8;
  }

  const intensityGap = Math.abs(profile.intensity - dish.intensity);
  score += 18 - intensityGap * 8;

  if (profile.type === "red") {
    if (dish.protein === "fish" || dish.protein === "seafood") score -= 22;
    if (dish.protein === "chicken") score -= 14;
    if (dish.creamRich) score -= 8;
    if (dish.protein === "none" && dish.foodCategory === "vegetable") score -= 4;
    score += (proteinAffinity(profile, dish) - 3) * 5;
    if (dish.smoke >= 4) score += (profile.style.smokeAffinity - 3) * 6;
    if (dish.fat >= 4 && profile.acidity != null && profile.acidity >= 6) {
      score += 6;
    }
    if (dish.family === "cabbage-roll" && dish.protein !== "none") score += 6;
    if (dish.family === "rich-pork-stew" && profile.intensity < 5) score -= 5;
  }

  if (profile.type === "white" || profile.type === "sparkling") {
    if (dish.protein === "pork" && dish.intensity >= 4) score -= 16;
    if (dish.smoke >= 4) score -= 18;
    if (dish.protein === "beef") score -= 20;
    if (dish.protein === "lamb" && dish.intensity >= 4) score -= 12;
    if (dish.protein === "rabbit") score -= 16;
    if (dish.protein === "duck") score -= 10;
    if (dish.protein === "fish" || dish.protein === "seafood") score += 16;
    if (dish.protein === "chicken") score += 8;
    if (dish.creamRich) score += (profile.style.creamyAffinity - 2) * 5;
    if (dish.fried && profile.style.acidityTendency >= 4) score += 6;
    if (dish.salt >= 4 && profile.style.acidityTendency >= 4) score += 5;
  }

  if (profile.type === "rose") {
    if (dish.protein === "fish" || dish.foodCategory === "vegetable") score += 10;
    if (dish.protein === "chicken") score += 8;
    if (dish.intensity >= 5) score -= 12;
  }

  if (profile.type === "orange") {
    if (dish.foodCategory === "vegetable") score += 12;
    if (dish.family === "cabbage-roll" && dish.protein === "none") score += 10;
    if (dish.protein === "fish") score += 4;
    if (dish.intensity >= 5 && dish.smoke >= 4) score -= 8;
  }

  if (profile.type === "sparkling") {
    if (dish.family === "roe" || dish.family === "cheese-pie") score += 12;
    if (dish.fried) score += 8;
    if (dish.family === "starter") score += 4;
    if (dish.family === "chicken-cream") score -= 10;
    if (dish.intensity >= 5) score -= 10;
  }

  if (profile.oakAged && (dish.protein === "chicken" || dish.creamRich)) {
    score += 4;
  }

  const preferred = profile.style.preferredFamilies ?? [];
  if (preferred.includes(dish.family)) score += 7;

  if (dish.smoke >= 4 && profile.style.smokeAffinity <= 3) {
    score -= 6;
  }
  if (dish.protein === "beef" && dish.discoveryValue <= 2) {
    if (profile.style.tanninTendency < 4) score -= 6;
  }
  if (
    dish.protein === "rabbit" &&
    profile.style.rabbitAffinity >= 4 &&
    profile.intensity <= 3
  ) {
    score += 5;
  }
  if (
    profile.type === "sparkling" &&
    (dish.family === "trout" || dish.family === "rich-pork-stew")
  ) {
    score -= 6;
  }

  if (dish.family === "sour-soup" || dish.sour || dish.acidity >= 4) {
    if (profile.type === "red" && profile.intensity >= 4) score -= 14;
    if (profile.type === "red" && (profile.alcohol ?? 0) >= 13.5) score -= 6;
    if (profile.type === "white" || profile.type === "sparkling") score += 8;
    if (profile.type === "rose" && dish.smoke >= 4) score += 4;
  }

  if (dish.family === "aspic-turkey") {
    if (profile.type === "sparkling" || profile.type === "white") score += 8;
    if (profile.type === "red" && profile.intensity >= 4) score -= 10;
  }
  if (dish.family === "aspic-pork" && profile.type === "red") score += 3;

  if (dish.family === "tomato-meatball" && profile.type === "white") score -= 6;
  if (dish.family === "fried-meatball" && profile.type === "white") score += 2;

  if (exactProducer) score += 18;
  else if (categoryProducer) score += 7;

  score += (dish.specificity ?? 2) - 2;

  if (dish.romanian) score += 3 + dish.discoveryValue * 0.7;
  else score -= 4;

  return {
    dish,
    score: Math.max(0, Math.round(score * 10) / 10),
    exactProducer,
    categoryProducer,
  };
}

export const COMPATIBILITY_THRESHOLD = 46;
