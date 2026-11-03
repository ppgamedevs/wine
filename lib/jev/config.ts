/**
 * Centralised configuration for the TypeSafe Jev integration.
 *
 * Rules enforced here:
 * - `JEV_MODE` defaults to `off`. An API key alone never enables Jev.
 * - Invalid or partial configuration fails safe (off / conservative defaults)
 *   instead of throwing at module load time.
 * - The API key is read server-side only and is never logged by this module.
 *
 * This module is intentionally free of `server-only` so the pure parsing rules
 * can be unit tested. Only server code imports it in the application.
 */

export const JEV_MODES = ["off", "shadow", "live"] as const;
export type JevMode = (typeof JEV_MODES)[number];

export const JEV_PERSONALIZATION_MODES = ["off", "shadow"] as const;
export type JevPersonalizationMode = (typeof JEV_PERSONALIZATION_MODES)[number];

export const JEV_DEFAULT_MODEL = "jev-latest";
export const JEV_DEFAULT_BASE_URL = "https://api.typesafe.ai";

/** Bumped whenever the question set or answer mapping changes; part of cache keys. */
export const JEV_PROMPT_VERSION = "sommelier-intent-v1";

export const JEV_LIMITS = {
  timeoutMs: { min: 1_000, max: 15_000, default: 6_000 },
  maxRetries: { min: 0, max: 2, default: 1 },
  minConfidence: { min: 0.4, max: 0.9, default: 0.55 },
  cacheTtlMs: { min: 0, max: 3_600_000, default: 300_000 },
  cacheMaxEntries: { min: 0, max: 2_000, default: 200 },
  maxConcurrent: { min: 1, max: 8, default: 3 },
  maxStateChars: { min: 200, max: 2_000, default: 1_000 },
} as const;

export interface JevConfig {
  /** Release gate for every Jev call. */
  mode: JevMode;
  /** Model alias sent to the official API. */
  model: string;
  /** Official API root. */
  baseUrl: string;
  /** Present only server-side. Never serialize or log this value. */
  apiKey: string | null;
  hasApiKey: boolean;
  /** Jev is reachable only when mode is not `off` and a key exists. */
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  /** Choice answers below this confidence are treated as unknown. */
  minConfidence: number;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  maxConcurrent: number;
  maxStateChars: number;
  /** Experimental personalised re-ranking. Shadow only until evaluated. */
  personalization: JevPersonalizationMode;
  /** Read-only provenance triage assistance in admin. */
  provenanceTriage: boolean;
  /** Configuration problems found while parsing. Safe to log: no secrets. */
  warnings: string[];
}

type EnvLike = Record<string, string | undefined>;

function readEnv(env: EnvLike, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseEnum<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized)
    ? (normalized as T)
    : fallback;
}

interface NumberRange {
  min: number;
  max: number;
  default: number;
}

function parseNumberInRange(
  raw: string | undefined,
  range: NumberRange,
): { value: number; invalid: boolean } {
  if (!raw) return { value: range.default, invalid: false };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return { value: range.default, invalid: true };
  if (parsed < range.min || parsed > range.max) {
    return { value: Math.min(range.max, Math.max(range.min, parsed)), invalid: true };
  }
  return { value: parsed, invalid: false };
}

function parseBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  return ["1", "true", "yes", "on", "enabled"].includes(raw.trim().toLowerCase());
}

const MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

/**
 * Resolve configuration from an environment-like object.
 *
 * Missing `TYPESAFE_API_KEY` is not an error: it disables Jev and records a
 * warning, because the key is expected to exist only on Vercel.
 */
export function resolveJevConfig(env: EnvLike = process.env): JevConfig {
  const warnings: string[] = [];

  const rawMode = readEnv(env, "JEV_MODE");
  const mode = parseEnum(rawMode, JEV_MODES, "off");
  if (rawMode && mode === "off" && rawMode.trim().toLowerCase() !== "off") {
    warnings.push("jev_mode_invalid_defaulted_to_off");
  }

  const rawModel = readEnv(env, "JEV_MODEL");
  let model = rawModel ?? JEV_DEFAULT_MODEL;
  if (rawModel && !MODEL_PATTERN.test(rawModel)) {
    model = JEV_DEFAULT_MODEL;
    warnings.push("jev_model_invalid_defaulted");
  }

  const rawBaseUrl = readEnv(env, "TYPESAFE_BASE_URL");
  let baseUrl = JEV_DEFAULT_BASE_URL;
  if (rawBaseUrl) {
    try {
      const parsed = new URL(rawBaseUrl);
      if (parsed.protocol === "https:") {
        baseUrl = rawBaseUrl.replace(/\/+$/, "");
      } else {
        warnings.push("jev_base_url_requires_https");
      }
    } catch {
      warnings.push("jev_base_url_invalid_defaulted");
    }
  }

  const timeout = parseNumberInRange(readEnv(env, "JEV_TIMEOUT_MS"), JEV_LIMITS.timeoutMs);
  if (timeout.invalid) warnings.push("jev_timeout_out_of_range_clamped");

  const retries = parseNumberInRange(readEnv(env, "JEV_MAX_RETRIES"), {
    ...JEV_LIMITS.maxRetries,
  });
  if (retries.invalid) warnings.push("jev_max_retries_out_of_range_clamped");

  const minConfidence = parseNumberInRange(readEnv(env, "JEV_MIN_CONFIDENCE"), {
    ...JEV_LIMITS.minConfidence,
  });
  if (minConfidence.invalid) warnings.push("jev_min_confidence_out_of_range_clamped");

  const cacheTtl = parseNumberInRange(readEnv(env, "JEV_CACHE_TTL_MS"), {
    ...JEV_LIMITS.cacheTtlMs,
  });
  if (cacheTtl.invalid) warnings.push("jev_cache_ttl_out_of_range_clamped");

  const cacheMax = parseNumberInRange(readEnv(env, "JEV_CACHE_MAX_ENTRIES"), {
    ...JEV_LIMITS.cacheMaxEntries,
  });
  if (cacheMax.invalid) warnings.push("jev_cache_max_entries_out_of_range_clamped");

  const concurrent = parseNumberInRange(readEnv(env, "JEV_MAX_CONCURRENT"), {
    ...JEV_LIMITS.maxConcurrent,
  });
  if (concurrent.invalid) warnings.push("jev_max_concurrent_out_of_range_clamped");

  const stateChars = parseNumberInRange(readEnv(env, "JEV_MAX_STATE_CHARS"), {
    ...JEV_LIMITS.maxStateChars,
  });
  if (stateChars.invalid) warnings.push("jev_max_state_chars_out_of_range_clamped");

  const rawPersonalization = readEnv(env, "JEV_PERSONALIZATION");
  const personalization = parseEnum(
    rawPersonalization,
    JEV_PERSONALIZATION_MODES,
    "off",
  );
  if (rawPersonalization && personalization === "off") {
    // "live" is deliberately not supported yet: shadow evaluation must run first.
    warnings.push("jev_personalization_only_off_or_shadow");
  }

  const provenanceTriage = parseBoolean(readEnv(env, "JEV_PROVENANCE_TRIAGE"));

  const publicKey = readEnv(env, "NEXT_PUBLIC_TYPESAFE_API_KEY");
  if (publicKey) {
    // A leaked secret is already in the client bundle; refuse to spend it.
    warnings.push("typesafe_key_must_not_be_public");
  }
  const apiKey = publicKey ? null : (readEnv(env, "TYPESAFE_API_KEY") ?? null);
  if (mode !== "off" && !apiKey) {
    warnings.push("jev_enabled_without_api_key");
  }

  return {
    mode,
    model,
    baseUrl,
    apiKey,
    hasApiKey: Boolean(apiKey),
    enabled: mode !== "off" && Boolean(apiKey),
    timeoutMs: timeout.value,
    maxRetries: Math.round(retries.value),
    minConfidence: minConfidence.value,
    cacheTtlMs: Math.round(cacheTtl.value),
    cacheMaxEntries: Math.round(cacheMax.value),
    maxConcurrent: Math.round(concurrent.value),
    maxStateChars: Math.round(stateChars.value),
    personalization,
    provenanceTriage,
    warnings,
  };
}

let cachedConfig: JevConfig | null = null;

/** Process-level configuration cache. Tests should call `resolveJevConfig` directly. */
export function getJevConfig(): JevConfig {
  if (!cachedConfig) cachedConfig = resolveJevConfig(process.env);
  return cachedConfig;
}

export function resetJevConfigForTests(): void {
  cachedConfig = null;
}

/** Safe, key-free configuration summary for logs and admin diagnostics. */
export function describeJevConfig(config: JevConfig): Record<string, unknown> {
  return {
    mode: config.mode,
    model: config.model,
    baseUrl: config.baseUrl,
    hasApiKey: config.hasApiKey,
    enabled: config.enabled,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    minConfidence: config.minConfidence,
    cacheTtlMs: config.cacheTtlMs,
    cacheMaxEntries: config.cacheMaxEntries,
    maxConcurrent: config.maxConcurrent,
    personalization: config.personalization,
    provenanceTriage: config.provenanceTriage,
    warnings: config.warnings,
  };
}
