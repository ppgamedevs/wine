/**
 * Safe wine pairing profile. Verified facts + style priors only.
 */
import {
  evidenceContextFromPairingFields,
  hasSafeProducerEvidenceForCategory,
} from "@/lib/curated-evidence";
import { categorizeFoodText, type FoodCategoryId } from "@/lib/food-taxonomy";
import {
  blendGrapeStyles,
  defaultStyleForType,
  findGrapeStyleProfile,
  GRAPE_PREFERRED_FAMILIES,
  resolvePreferredFamilies,
  type GrapeStyleProfile,
} from "@/lib/pairing/grape-style-profiles";
import { foldDishName } from "@/lib/pairing/romanian-dishes";
import type { WineWithRelations } from "@/types";

export interface WinePairingProfile {
  type: string;
  sweetness: string;
  alcohol: number | null;
  acidity: number | null;
  sugar: number | null;
  intensity: number;
  grapeNames: string[];
  style: GrapeStyleProfile;
  producerCategories: FoodCategoryId[];
  producerExactDishes: string[];
  oakAged: boolean;
  hasTechnicalFacts: boolean;
}

function grapeWeight(
  grape: { name: string; percentage?: number },
  fallback: number,
): number {
  return grape.percentage != null && grape.percentage > 0
    ? grape.percentage
    : fallback;
}

export function buildWinePairingProfile(
  wine: WineWithRelations,
): WinePairingProfile {
  const grapes = wine.grapeVarieties ?? [];
  const knownWeights = grapes.filter(
    (grape) => grape.percentage != null && grape.percentage > 0,
  );
  const fallback = knownWeights.length === grapes.length && grapes.length > 0 ? 0 : 1;
  const parts = grapes.map((grape) => ({
    profile:
      findGrapeStyleProfile(grape.name) ?? defaultStyleForType(wine.type),
    weight: grapeWeight(grape, fallback || 1),
  }));
  const blended =
    parts.length > 0
      ? blendGrapeStyles(parts)
      : defaultStyleForType(wine.type);
  const typeFamilies = GRAPE_PREFERRED_FAMILIES[`default-${wine.type}`] ?? [];
  const style: GrapeStyleProfile = {
    ...blended,
    preferredFamilies: [
      ...new Set([...resolvePreferredFamilies(blended), ...typeFamilies]),
    ],
  };

  let intensity: number = style.foodIntensity;
  if (wine.alcohol != null) {
    if (wine.alcohol >= 14.5) intensity += 1;
    else if (wine.alcohol <= 12) intensity -= 0.5;
  }
  if (wine.type === "sparkling") intensity = Math.min(intensity, 2.5);
  if (wine.type === "rose") intensity = Math.min(intensity, 3);
  intensity = Math.max(1, Math.min(5, intensity));

  const context = evidenceContextFromPairingFields({
    type: wine.type,
    sweetness: wine.sweetness,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    producerCulinaryPairings: wine.producerContent?.culinaryPairings,
    foodEvidence: wine.producerContent?.foodEvidence,
    culinaryLaundryRejected: wine.producerContent?.culinaryLaundryRejected,
    culinaryChromeRejected: wine.producerContent?.culinaryChromeRejected,
  });
  const producerCategories = (["sarmale", "grilled_meat", "pork", "beef", "poultry", "fish", "cheese", "vegetable", "dessert", "festive_traditional"] as FoodCategoryId[]).filter(
    (category) => hasSafeProducerEvidenceForCategory(context, category),
  );
  const producerExactDishes = (wine.producerContent?.foodEvidence ?? [])
    .filter((claim) =>
      hasSafeProducerEvidenceForCategory(context, claim.category as FoodCategoryId),
    )
    .map((claim) => foldDishName(claim.dish));
  if (wine.producerContent?.culinaryPairings) {
    for (const token of wine.producerContent.culinaryPairings.split(/[,;.]+/)) {
      const folded = foldDishName(token);
      if (folded) producerExactDishes.push(folded);
    }
  }

  return {
    type: wine.type,
    sweetness: wine.sweetness ?? "sec",
    alcohol: wine.alcohol ?? null,
    acidity: wine.acidity ?? null,
    sugar: wine.sugar ?? null,
    intensity,
    grapeNames: grapes.map((grape) => grape.name),
    style,
    producerCategories,
    producerExactDishes: [...new Set(producerExactDishes)],
    oakAged: wine.producerContent?.facts?.oakAged === true,
    hasTechnicalFacts:
      wine.alcohol != null || wine.acidity != null || wine.sugar != null,
  };
}

export function producerMentionsDish(
  profile: WinePairingProfile,
  dishName: string,
  aliases: string[],
): boolean {
  const names = [dishName, ...aliases].map(foldDishName);
  return profile.producerExactDishes.some((mentioned) =>
    names.some((name) => mentioned === name || mentioned.includes(name)),
  );
}

export function producerMentionsCategory(
  profile: WinePairingProfile,
  category: FoodCategoryId,
): boolean {
  if (profile.producerCategories.includes(category)) return true;
  return profile.producerExactDishes.some(
    (mentioned) => categorizeFoodText(mentioned)[0] === category,
  );
}
