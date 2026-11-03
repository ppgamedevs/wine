/**
 * Independent release gate for deterministic Sommelier grounding.
 *
 * Grounding suppresses recommendations when the catalog has no honest match.
 * It is intentionally separate from Jev: it must work with `JEV_MODE=off`.
 * Missing or invalid configuration keeps the protective default (`enforce`).
 */
export const SOMMELIER_GROUNDING_MODES = ["off", "enforce"] as const;

export type SommelierGroundingMode = (typeof SOMMELIER_GROUNDING_MODES)[number];

const DEFAULT_MODE: SommelierGroundingMode = "enforce";

let testOverride: SommelierGroundingMode | null = null;

export function parseSommelierGroundingMode(
  raw: string | undefined | null,
): SommelierGroundingMode {
  const value = raw?.trim().toLowerCase();
  if (value === "off" || value === "false" || value === "0") return "off";
  return DEFAULT_MODE;
}

export function getSommelierGroundingMode(): SommelierGroundingMode {
  if (testOverride) return testOverride;
  return parseSommelierGroundingMode(process.env.SOMMELIER_GROUNDING);
}

export function isSommelierGroundingEnabled(): boolean {
  return getSommelierGroundingMode() === "enforce";
}

export function setSommelierGroundingModeForTests(
  mode: SommelierGroundingMode | null,
): void {
  testOverride = mode;
}
