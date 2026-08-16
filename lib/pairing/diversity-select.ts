/**
 * Choose up to four diverse, defensible dishes.
 */
import type { DishCompatibilityResult } from "@/lib/pairing/dish-compatibility";
import { COMPATIBILITY_THRESHOLD } from "@/lib/pairing/dish-compatibility";

function sharesExperience(
  left: DishCompatibilityResult,
  right: DishCompatibilityResult,
): boolean {
  if (left.dish.family === right.dish.family) return true;
  if (
    left.dish.protein !== "none" &&
    left.dish.protein === right.dish.protein &&
    left.dish.cookingMethods[0] === right.dish.cookingMethods[0]
  ) {
    return true;
  }
  return false;
}

function proteinCount(
  selected: DishCompatibilityResult[],
  protein: DishCompatibilityResult["dish"]["protein"],
): number {
  return selected.filter((row) => row.dish.protein === protein).length;
}

function canAdd(
  selected: DishCompatibilityResult[],
  candidate: DishCompatibilityResult,
): boolean {
  if (selected.some((item) => item.dish.id === candidate.dish.id)) return false;
  if (selected.some((item) => sharesExperience(item, candidate))) return false;
  const sameCategory = selected.filter(
    (item) => item.dish.foodCategory === candidate.dish.foodCategory,
  ).length;
  if (
    sameCategory >= 1 &&
    (candidate.dish.foodCategory === "vegetable" ||
      candidate.dish.foodCategory === "cheese")
  ) {
    return false;
  }
  if (candidate.dish.protein === "none") return true;
  const sameProtein = proteinCount(selected, candidate.dish.protein);
  if (sameProtein === 0) return true;
  const cabbageException =
    candidate.dish.family === "cabbage-roll" ||
    selected.some((item) => item.dish.family === "cabbage-roll");
  if (cabbageException && sameProtein < 2 && candidate.dish.protein === "pork") {
    return true;
  }
  return false;
}

function pickBest(
  pool: DishCompatibilityResult[],
  selected: DishCompatibilityResult[],
  scoreOf: (row: DishCompatibilityResult) => number,
): DishCompatibilityResult | null {
  const eligible = pool.filter((row) => canAdd(selected, row));
  if (eligible.length === 0) return null;
  return [...eligible].sort((left, right) => {
    const delta = scoreOf(right) - scoreOf(left);
    if (delta !== 0) return delta;
    return left.dish.id.localeCompare(right.dish.id);
  })[0] ?? null;
}

export function selectDiversePairings(
  ranked: DishCompatibilityResult[],
  limit = 4,
): DishCompatibilityResult[] {
  const viable = ranked.filter((row) => row.score >= COMPATIBILITY_THRESHOLD);
  const selected: DishCompatibilityResult[] = [];
  const best = viable[0];
  if (!best) return [];
  selected.push(best);

  const leadProtein = selected[0]?.dish.protein;
  const discovery = pickBest(
    viable,
    selected,
    (row) =>
      row.dish.discoveryValue * 10 +
      row.score +
      (row.dish.family === "cabbage-roll" &&
      (leadProtein === "pork" ||
        leadProtein === "lamb" ||
        leadProtein === "duck" ||
        leadProtein === "beef" ||
        leadProtein === "game")
        ? 16
        : 0),
  );
  if (discovery) selected.push(discovery);

  const savory = pickBest(viable, selected, (row) => row.score);
  if (savory) selected.push(savory);

  const wildcard = pickBest(
    viable,
    selected,
    (row) => row.score + row.dish.discoveryValue * 3,
  );
  if (wildcard) selected.push(wildcard);

  if (selected.length < limit) {
    for (const candidate of viable) {
      if (selected.length >= limit) break;
      if (!canAdd(selected, candidate)) continue;
      selected.push(candidate);
    }
  }

  return selected.slice(0, limit);
}
