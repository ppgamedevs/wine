/**
 * Client-safe duplicate matching for pairing curation.
 * Does not import scoring or Node storage.
 */
import { categorizeFoodText, type FoodCategoryId } from "@/lib/food-taxonomy";
import { findRomanianDishByName } from "@/lib/pairing/romanian-dishes";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type { FoodPairing } from "@/lib/schema";

export const EDITORIAL_DISHES: Array<{
  dish: string;
  category: FoodCategoryId;
  aliases: string[];
}> = [
  { dish: "Sarmale", category: "sarmale", aliases: ["sarma", "sarmalute"] },
  { dish: "Mici", category: "grilled_meat", aliases: ["mititei"] },
  { dish: "Carne de vita la gratar", category: "grilled_meat", aliases: ["vita la gratar"] },
  { dish: "Ceafa de porc", category: "pork", aliases: ["porc", "cotlet"] },
  { dish: "Carne de miel", category: "festive_traditional", aliases: ["miel"] },
  { dish: "Pasare", category: "poultry", aliases: ["pui", "rata"] },
  { dish: "Peste alb", category: "fish", aliases: [] },
  { dish: "Somon", category: "fish", aliases: ["peste gras"] },
  { dish: "Fructe de mare", category: "fish", aliases: [] },
  { dish: "Paste", category: "pasta", aliases: ["spaghetti"] },
  { dish: "Pizza", category: "pizza", aliases: [] },
  { dish: "Branzeturi proaspete", category: "cheese", aliases: ["telemea"] },
  { dish: "Branzeturi maturate", category: "cheese", aliases: ["branza matura"] },
  { dish: "Legume", category: "vegetable", aliases: [] },
  { dish: "Salate", category: "vegetable", aliases: ["salata"] },
  { dish: "Aperitive", category: "vegetable", aliases: [] },
  { dish: "Cozonac", category: "dessert", aliases: [] },
  { dish: "Pasca", category: "dessert", aliases: [] },
  { dish: "Desert cu fructe", category: "dessert", aliases: [] },
  { dish: "Desert cu ciocolata", category: "chocolate", aliases: ["ciocolata"] },
];

export function foldPairingText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dishAliasFolds(dish: string): string[] {
  const folded = foldPairingText(dish);
  const row = EDITORIAL_DISHES.find(
    (item) =>
      foldPairingText(item.dish) === folded ||
      item.aliases.some((alias) => foldPairingText(alias) === folded),
  );
  if (!row) return [folded];
  return [foldPairingText(row.dish), ...row.aliases.map((alias) => foldPairingText(alias))];
}

function pairingCategoryKey(item: { dish: string; category?: string }): string | null {
  if (item.category?.trim()) return foldPairingText(item.category);
  return categorizeFoodText(item.dish)[0] ?? null;
}

export function draftMatchesExistingPairing(
  draft: { dish: string; category: string },
  existing: Array<{ dish: string; category?: string }>,
): boolean {
  const draftDishes = new Set(dishAliasFolds(draft.dish));
  const draftCategory = foldPairingText(draft.category) || pairingCategoryKey(draft);
  const draftLibrary = findRomanianDishByName(draft.dish);
  return existing.some((pairing) => {
    if (dishAliasFolds(pairing.dish).some((dish) => draftDishes.has(dish))) {
      return true;
    }
    const existingLibrary = findRomanianDishByName(pairing.dish);
    if (
      draftLibrary &&
      existingLibrary &&
      draftLibrary.family === existingLibrary.family
    ) {
      return true;
    }
    const existingCategory = pairingCategoryKey(pairing);
    return Boolean(
      draftCategory && existingCategory && draftCategory === existingCategory,
    );
  });
}

export function partitionPairingDrafts<T extends { dish: string; category: string }>(
  drafts: T[],
  existing: Array<{ dish: string; category?: string }>,
): { newDrafts: T[]; alreadyApprovedDrafts: T[] } {
  const newDrafts: T[] = [];
  const alreadyApprovedDrafts: T[] = [];
  for (const draft of drafts) {
    if (draftMatchesExistingPairing(draft, existing)) {
      alreadyApprovedDrafts.push(draft);
    } else {
      newDrafts.push(draft);
    }
  }
  return { newDrafts, alreadyApprovedDrafts };
}

export function prepareApprovalDrafts(
  drafts: PairingDraft[],
  existing: FoodPairing[],
): PairingDraft[] {
  const { newDrafts } = partitionPairingDrafts(drafts, existing);
  if (newDrafts.length === 0) {
    throw new Error("Toate asocierile selectate sunt deja aprobate.");
  }
  return newDrafts;
}
