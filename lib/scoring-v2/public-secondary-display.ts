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
