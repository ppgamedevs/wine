/**
 * Map a human-readable dish string to a stable dish identity.
 * Dry-run safe. Does not mutate stored pairings.
 */
import {
  findRomanianDishByName,
  foldDishName,
  ROMANIAN_DISHES,
  type RomanianDishProfile,
} from "@/lib/pairing/romanian-dishes";
import { foldRomanianText } from "@/lib/pairing/romanian-text";

export type CanonicalDishMatchType =
  | "exact"
  | "alias"
  | "serving_variant"
  | "unresolved"
  | "ambiguous";

export interface CanonicalDishMapping {
  input: string;
  matchType: CanonicalDishMatchType;
  dishId?: string;
  servingVariantId?: string;
  canonicalName?: string;
  candidates?: string[];
}

function accompanimentToken(value: string): string | null {
  const folded = foldRomanianText(value);
  if (folded.includes("paine de casa") || folded.endsWith("paine de casa")) {
    return "paine-de-casa";
  }
  if (folded.includes("branza de burduf") && folded.includes("bulz")) {
    return "branza-de-burduf";
  }
  return null;
}

export function mapDishToCanonical(input: string): CanonicalDishMapping {
  const trimmed = input.trim();
  if (!trimmed) return { input, matchType: "unresolved" };
  const folded = foldDishName(trimmed);

  const variantHits: Array<{ dish: RomanianDishProfile; variantId: string }> = [];
  for (const dish of ROMANIAN_DISHES) {
    for (const variant of dish.servingVariants ?? []) {
      if (foldDishName(variant.name) === folded || foldDishName(variant.id) === folded) {
        variantHits.push({ dish, variantId: variant.id });
      }
    }
  }
  if (variantHits.length === 1) {
    const hit = variantHits[0]!;
    return {
      input,
      matchType: "serving_variant",
      dishId: hit.dish.id,
      servingVariantId: hit.variantId,
      canonicalName: hit.dish.name,
    };
  }
  if (variantHits.length > 1) {
    return {
      input,
      matchType: "ambiguous",
      candidates: variantHits.map((hit) => hit.dish.id),
    };
  }

  const exactName = ROMANIAN_DISHES.filter((dish) => foldDishName(dish.name) === folded);
  if (exactName.length === 1) {
    const accompaniment = accompanimentToken(trimmed);
    return {
      input,
      matchType: "exact",
      dishId: exactName[0]!.id,
      servingVariantId: accompaniment ?? undefined,
      canonicalName: exactName[0]!.name,
    };
  }
  if (exactName.length > 1) {
    return {
      input,
      matchType: "ambiguous",
      candidates: exactName.map((dish) => dish.id),
    };
  }

  const aliasHits = ROMANIAN_DISHES.filter((dish) =>
    dish.aliases.some((alias) => foldDishName(alias) === folded),
  );
  if (aliasHits.length === 1) {
    return {
      input,
      matchType: "alias",
      dishId: aliasHits[0]!.id,
      canonicalName: aliasHits[0]!.name,
    };
  }
  if (aliasHits.length > 1) {
    return {
      input,
      matchType: "ambiguous",
      candidates: aliasHits.map((dish) => dish.id),
    };
  }

  const byLookup = findRomanianDishByName(trimmed);
  if (byLookup) {
    const accompaniment = accompanimentToken(trimmed);
    const viaVariant = (byLookup.servingVariants ?? []).find(
      (variant) =>
        foldDishName(variant.name) === folded || accompaniment === variant.id,
    );
    return {
      input,
      matchType: viaVariant ? "serving_variant" : "alias",
      dishId: byLookup.id,
      servingVariantId: viaVariant?.id,
      canonicalName: byLookup.name,
    };
  }

  return { input, matchType: "unresolved" };
}
