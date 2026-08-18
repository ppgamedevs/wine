/**
 * Public Gift/Food display. Value Score is never altered here.
 *
 * shadow/legacy: stored numbers, identical to production.
 * display/live: v2 numbers, hidden when evidence does not justify precision.
 */
import { publicFoodProvenanceCaption } from "@/lib/curated-evidence";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import { usesSecondaryV2Display } from "@/lib/scoring-v2/secondary-scoring-mode";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
  type WineLikeForSecondaryScores,
} from "@/lib/scoring-v2/wine-score-inputs";

export interface PublicScoreDisplay {
  score: number | null;
  caption: string | null;
  provisional: boolean;
}

export interface PublicSecondaryScores {
  gift: PublicScoreDisplay;
  food: PublicScoreDisplay;
}

const GIFT_HIDE_BELOW = 40;
const GIFT_LIMITED_BELOW = 55;

export function publicGiftScoreDisplay(
  wine: WineLikeForSecondaryScores & { giftScore?: number | null },
): PublicScoreDisplay {
  if (!usesSecondaryV2Display()) {
    return {
      score: wine.giftScore ?? null,
      caption: null,
      provisional: false,
    };
  }

  const gift = calculateGiftScore(giftScoreInputFromWine(wine));
  if (gift.confidence < GIFT_HIDE_BELOW) {
    return {
      score: null,
      caption: "Nu avem încă suficiente date pentru un Gift Score precis.",
      provisional: true,
    };
  }
  if (gift.confidence < GIFT_LIMITED_BELOW) {
    return {
      score: gift.score,
      caption: `Gift Score ${gift.score} · date limitate`,
      provisional: true,
    };
  }
  return { score: gift.score, caption: null, provisional: false };
}

export function publicFoodScoreDisplay(
  wine: WineLikeForSecondaryScores & { foodMatchScore?: number | null },
): PublicScoreDisplay {
  if (!usesSecondaryV2Display()) {
    return {
      score: wine.foodMatchScore ?? null,
      caption: null,
      provisional: false,
    };
  }

  const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
  if (!food.displayable || food.evidenceLevel === "style_only" || food.evidenceLevel === "insufficient") {
    return {
      score: null,
      caption:
        "Avem încă puține dovezi pentru un scor general de versatilitate.",
      provisional: true,
    };
  }
  const provenanceCaption = publicFoodProvenanceCaption(food.evidenceProvenance);
  return {
    score: food.score,
    caption:
      food.evidenceLevel === "curated_editorial" || food.evidenceProvenance === "editorial" || food.evidenceProvenance === "structured"
        ? provenanceCaption
        : food.provisional
          ? provenanceCaption ?? `Versatilitate ${food.score} · date limitate`
          : provenanceCaption,
    provisional: food.provisional,
  };
}

/**
 * Canonical public view model for secondary scores.
 *
 * Public cards, copy, SEO and AI context must consume this resolver instead of
 * reading stored Gift/Food fields. Ranking and internal diagnostics remain
 * separate and may intentionally use their own staged rollout semantics.
 */
export function resolvePublicSecondaryScores(
  wine: WineLikeForSecondaryScores & {
    giftScore?: number | null;
    foodMatchScore?: number | null;
  },
): PublicSecondaryScores {
  return {
    gift: publicGiftScoreDisplay(wine),
    food: publicFoodScoreDisplay(wine),
  };
}

/**
 * Defensive boundary for persisted or generated prose. It rewrites explicit
 * secondary-score claims to the current public view model and removes numeric
 * precision when that score is hidden.
 */
export function sanitizePublicSecondaryCopy(
  text: string | null | undefined,
  wine: WineLikeForSecondaryScores & {
    giftScore?: number | null;
    foodMatchScore?: number | null;
  },
): string {
  if (!text) return "";
  const { gift, food } = resolvePublicSecondaryScores(wine);
  const giftReplacement =
    gift.score == null
      ? gift.caption ?? "Gift Score indisponibil."
      : `Gift Score ${gift.score}/100`;
  const foodReplacement =
    food.score == null
      ? food.caption ??
        "Nu avem încă suficiente date pentru un scor general precis de versatilitate la masă."
      : `Versatilitate la masă ${food.score}/100`;

  return text
    .replace(
      /\bGift Score\b\s*(?:(?:este|de)\s*)?:?\s*\d{1,3}(?:\/100)?/gi,
      giftReplacement,
    )
    .replace(
      /\b(?:Food Match|Versatilitatea? la mas[ăa])\b\s*(?:(?:este|de)\s*)?:?\s*\d{1,3}(?:\/100)?/gi,
      foodReplacement,
    );
}
