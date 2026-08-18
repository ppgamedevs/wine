/**
 * Rollout gate for Gift v2 and Food Versatility v2.
 *
 * Occasion Match has its own gate in recommendation/occasion-match-mode.ts.
 * Default is shadow. Display/live are never defaults.
 *
 * legacy  - stored secondary display and legacy ranking
 * shadow  - same public behavior as legacy; v2 diagnostics only
 * display - v2 display with confidence gates; legacy ranking
 * live    - v2 display and explicitly supported v2 ranking
 */

export const SECONDARY_SCORING_MODES = [
  "legacy",
  "shadow",
  "display",
  "live",
] as const;

export type SecondaryScoringMode = (typeof SECONDARY_SCORING_MODES)[number];

const DEFAULT_MODE: SecondaryScoringMode = "shadow";

let testOverride: SecondaryScoringMode | null = null;

export function parseSecondaryScoringMode(
  raw: string | undefined | null,
): SecondaryScoringMode {
  const value = raw?.trim().toLowerCase();
  if (value === "live") return "live";
  if (value === "display") return "display";
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

/** Public score components may compute and show v2 in display or live mode. */
export function usesSecondaryV2Display(): boolean {
  const mode = getSecondaryScoringMode();
  return mode === "display" || mode === "live";
}

/** Public sorting/ranking may consult v2 only in live mode. */
export function usesSecondaryV2Ranking(): boolean {
  return getSecondaryScoringMode() === "live";
}

/** @deprecated Use the explicit display/ranking helper at each call site. */
export function usesPublicSecondaryV2(): boolean {
  return usesSecondaryV2Ranking();
}

export function setSecondaryScoringModeForTests(
  mode: SecondaryScoringMode | null,
): void {
  testOverride = mode;
}
