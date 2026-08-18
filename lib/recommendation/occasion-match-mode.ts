/**
 * Independent public release gate for Occasion Match.
 *
 * Gift/Food display or ranking rollout must never expose Occasion Match.
 * Missing and invalid configuration fails safe to internal.
 */
export const OCCASION_MATCH_MODES = ["internal", "public"] as const;

export type OccasionMatchMode = (typeof OCCASION_MATCH_MODES)[number];

const DEFAULT_MODE: OccasionMatchMode = "internal";

let testOverride: OccasionMatchMode | null = null;

export function parseOccasionMatchMode(
  raw: string | undefined | null,
): OccasionMatchMode {
  return raw?.trim().toLowerCase() === "public" ? "public" : DEFAULT_MODE;
}

export function getOccasionMatchMode(): OccasionMatchMode {
  if (testOverride) return testOverride;
  return parseOccasionMatchMode(process.env.OCCASION_MATCH_MODE);
}

export function usesPublicOccasionMatch(): boolean {
  return getOccasionMatchMode() === "public";
}

export function setOccasionMatchModeForTests(
  mode: OccasionMatchMode | null,
): void {
  testOverride = mode;
}
