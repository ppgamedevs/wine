import type { Wine } from "@/types";

export interface CommunityScoreDisplay {
  score: number | null;
  voteCount: number;
  /** True when score comes from live VinIntel community votes. */
  isLiveCommunity: boolean;
}

/**
 * Returns community score for display. Prefers live community votes;
 * falls back to legacy seed ratings (1-5 scale mapped to 0-100).
 */
export function getCommunityScoreDisplay(
  wine: Pick<
    Wine,
    "communityScore" | "communityVoteCount" | "ratingAvg" | "ratingCount"
  >,
): CommunityScoreDisplay {
  if (wine.communityVoteCount > 0 && wine.communityScore != null) {
    return {
      score: wine.communityScore,
      voteCount: wine.communityVoteCount,
      isLiveCommunity: true,
    };
  }

  if (wine.ratingCount > 0 && wine.ratingAvg != null) {
    return {
      score: Math.round(wine.ratingAvg * 20),
      voteCount: wine.ratingCount,
      isLiveCommunity: false,
    };
  }

  return {
    score: null,
    voteCount: 0,
    isLiveCommunity: false,
  };
}

/**
 * Combined score for future ranking (not used in UI yet).
 * VinIntel expert score weighted 70%, community 30%.
 */
export function calculateCombinedScore(
  vinIntelScore: number | null | undefined,
  communityScore: number | null | undefined,
): number | null {
  if (vinIntelScore == null && communityScore == null) return null;
  if (vinIntelScore == null) return communityScore ?? null;
  if (communityScore == null) return vinIntelScore;

  return Math.round(vinIntelScore * 0.7 + communityScore * 0.3);
}

export function formatCommunityVoteLabel(voteCount: number): string {
  if (voteCount === 0) return "inca fara voturi";
  if (voteCount === 1) return "bazat pe 1 vot";
  return `bazat pe ${voteCount} voturi`;
}

export const VININTEL_SCORE_EXPLANATION = "";

export const COMMUNITY_SCORE_EXPLANATION =
  "Media notelor date de utilizatorii VinIntel, pe aceeasi scala 0-100. Contribuie cu votul tau dupa degustare.";
