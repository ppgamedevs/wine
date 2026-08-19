import { matchDishPairingSlug } from "@/lib/dish-pairing-pages";
import { scoreDishCompatibility } from "@/lib/pairing/dish-compatibility";
import {
  findRomanianDishByName,
  ROMANIAN_DISHES,
  type RomanianDishProfile,
} from "@/lib/pairing/romanian-dishes";
import { pairingRationale } from "@/lib/pairing/pairing-rationale";
import { buildWinePairingProfile } from "@/lib/pairing/wine-pairing-profile";
import { isPublicProducerBackedPairing } from "@/lib/pairing-curation";
import type { FoodPairing, FoodPairingStrength } from "@/lib/schema";
import type { WineWithRelations } from "@/types";
import type { AppLocale } from "@/i18n/locale";
import { getDishPresentation } from "@/lib/i18n/dishes";

export interface PublicWinePairing {
  dish: string;
  dishSlug: string | null;
  score: number | null;
  rawScore: number | null;
  scoreSource: "dish_compatibility" | "stored_pairing" | "none";
  rationale: string | null;
  attribution:
    | "Recomandare VinIntel"
    | "Recomandat și de producător"
    | "VinIntel recommendation"
    | "Also recommended by the producer";
  strength: FoodPairingStrength;
}

const STRENGTH_RANK: Record<FoodPairingStrength, number> = {
  strong: 3,
  good: 2,
  possible: 1,
};

function resolveCanonicalDish(
  pairing: FoodPairing,
): RomanianDishProfile | null {
  if (pairing.dishId) {
    const byId = ROMANIAN_DISHES.find((dish) => dish.id === pairing.dishId);
    if (byId) return byId;
  }
  return findRomanianDishByName(pairing.dish) ?? null;
}

function publicScore(rawScore: number): number {
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

function supportedStoredScore(pairing: FoodPairing): number | null {
  if (pairing.source === "vinintel_curated") return null;
  if (
    pairing.score == null ||
    !Number.isFinite(pairing.score) ||
    pairing.score < 0 ||
    pairing.score > 100
  ) {
    return null;
  }
  return Math.round(pairing.score);
}

export function resolvePublicWinePairings(
  wine: WineWithRelations,
  limit = 4,
  locale: AppLocale = "ro",
): PublicWinePairing[] {
  const profile = buildWinePairingProfile(wine);

  return (wine.foodPairings ?? [])
    .filter(
      (pairing) => locale === "ro" || resolveCanonicalDish(pairing) !== null,
    )
    .map((pairing, index) => {
      const canonicalDish = resolveCanonicalDish(pairing);
      const compatibility = canonicalDish
        ? scoreDishCompatibility(profile, canonicalDish)
        : null;
      const storedScore =
        compatibility == null ? supportedStoredScore(pairing) : null;
      const rawScore = compatibility?.score ?? storedScore;
      const producerBacked = isPublicProducerBackedPairing(wine, pairing);

      const dishPresentation = canonicalDish
        ? getDishPresentation(canonicalDish.id, locale)
        : null;
      return {
        index,
        pairing: {
          dish: dishPresentation?.displayName ?? pairing.dish,
          dishSlug: matchDishPairingSlug(pairing.dish),
          score: rawScore == null ? null : publicScore(rawScore),
          rawScore,
          scoreSource:
            compatibility != null
              ? ("dish_compatibility" as const)
              : storedScore != null
                ? ("stored_pairing" as const)
                : ("none" as const),
          rationale:
            (locale === "ro" ? pairing.note?.trim() : null) ||
            (canonicalDish
              ? pairingRationale(
                  profile,
                  canonicalDish,
                  producerBacked,
                  locale,
                )
              : null),
          attribution: producerBacked
            ? locale === "en"
              ? ("Also recommended by the producer" as const)
              : ("Recomandat și de producător" as const)
            : locale === "en"
              ? ("VinIntel recommendation" as const)
              : ("Recomandare VinIntel" as const),
          strength: pairing.strength ?? "possible",
        },
      };
    })
    .sort((left, right) => {
      const leftHasScore = left.pairing.rawScore != null;
      const rightHasScore = right.pairing.rawScore != null;
      if (leftHasScore !== rightHasScore) return rightHasScore ? 1 : -1;
      if (left.pairing.rawScore != null && right.pairing.rawScore != null) {
        const scoreDelta =
          right.pairing.rawScore - left.pairing.rawScore;
        if (scoreDelta !== 0) return scoreDelta;
      }
      const strengthDelta =
        STRENGTH_RANK[right.pairing.strength] -
        STRENGTH_RANK[left.pairing.strength];
      return strengthDelta || left.index - right.index;
    })
    .slice(0, Math.max(0, limit))
    .map(({ pairing }) => pairing);
}
