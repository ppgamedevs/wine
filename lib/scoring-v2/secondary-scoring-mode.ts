/**
 * Rollout gate for Gift v2, Food Versatility v2 and Occasion Match v1.
 *
 * Default is shadow. Live is never the default.
 *
 * legacy  - public ranking and display use stored production scores
 * shadow  - public UI identical to legacy; v2 is for scripts, tests, logs
 * live    - one v2 system for ranking and display, only after explicit approval
 */

export const SECONDARY_SCORING_MODES = ["legacy", "shadow", "live"] as const;

export type SecondaryScoringMode = (typeof SECONDARY_SCORING_MODES)[number];

const DEFAULT_MODE: SecondaryScoringMode = "shadow";

let testOverride: SecondaryScoringMode | null = null;

export function parseSecondaryScoringMode(
  raw: string | undefined | null,
): SecondaryScoringMode {
  const value = raw?.trim().toLowerCase();
  if (value === "live") return "live";
  if (value === "legacy") return "legacy";
  if (value === "shadow") return "shadow";
  return DEFAULT_MODE;
}

export function getSecondaryScoringMode(): SecondaryScoringMode {
  if (testOverride) return testOverride;
  return parseSecondaryScoringMode(process.env.SECONDARY_SCORING_MODE);
}

export function isSecondaryScoringLive(): boolean {
  return getSecondaryScoringMode() === "live";
}

/** Public pages may compute or show v2 only in live mode. */
export function usesPublicSecondaryV2(): boolean {
  return isSecondaryScoringLive();
}

export function setSecondaryScoringModeForTests(
  mode: SecondaryScoringMode | null,
): void {
  testOverride = mode;
}
