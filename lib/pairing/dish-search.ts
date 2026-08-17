/**
 * Accent-insensitive Romanian dish search. Internal helper, no public pages.
 */
import {
  findRomanianDishByName,
  ROMANIAN_DISHES,
  type RomanianDishProfile,
} from "@/lib/pairing/romanian-dishes";
import { foldRomanianText, foldRomanianWords } from "@/lib/pairing/romanian-text";

function searchableText(dish: RomanianDishProfile): string {
  return [
    dish.id,
    dish.name,
    ...dish.aliases,
    ...(dish.servingVariants ?? []).flatMap((variant) => [variant.id, variant.name]),
  ].join(" ");
}

export function findRomanianDishes(query: string): RomanianDishProfile[] {
  const folded = foldRomanianText(query);
  if (!folded) return [];
  const exact = findRomanianDishByName(query);
  if (exact) return [exact];
  const words = foldRomanianWords(query);
  return ROMANIAN_DISHES.filter((dish) => {
    const hay = foldRomanianText(searchableText(dish));
    return words.every((word) => hay.includes(word));
  }).sort((left, right) => {
    const leftSpecific = left.specificity ?? 2;
    const rightSpecific = right.specificity ?? 2;
    if (rightSpecific !== leftSpecific) return rightSpecific - leftSpecific;
    return left.id.localeCompare(right.id);
  });
}
