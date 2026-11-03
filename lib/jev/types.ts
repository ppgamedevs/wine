/**
 * Typed contracts for the TypeSafe Jev integration.
 *
 * Wire-format types mirror the official `POST /v1/systemone` contract
 * (https://docs.typesafe.ai/api/systemone). Application-facing types are
 * narrower: every uncertain value stays `null`/`unknown` instead of being
 * guessed.
 */

export type JevChoiceValue<T extends string> = T | "unknown";

export const JEV_OCCASIONS = [
  "everyday",
  "romantic_dinner",
  "gift",
  "celebration",
  "business",
  "unknown",
] as const;
export type JevOccasion = (typeof JEV_OCCASIONS)[number];

export const JEV_FOOD_CATEGORIES = [
  "red_meat",
  "white_meat",
  "fish",
  "seafood",
  "pasta",
  "cheese",
  "dessert",
  "traditional_romanian",
  "other",
  "unknown",
] as const;
export type JevFoodCategory = (typeof JEV_FOOD_CATEGORIES)[number];

export const JEV_WINE_COLORS = [
  "red",
  "white",
  "rose",
  "sparkling",
  "no_preference",
  "unknown",
] as const;
export type JevWineColor = (typeof JEV_WINE_COLORS)[number];

export const JEV_SWEETNESS = [
  "dry",
  "off_dry",
  "semi_sweet",
  "sweet",
  "unknown",
] as const;
export type JevSweetness = (typeof JEV_SWEETNESS)[number];

export const JEV_INTENSITIES = ["low", "medium", "high", "unknown"] as const;
export type JevIntensity = (typeof JEV_INTENSITIES)[number];

export const JEV_BODY = ["light", "medium", "full", "unknown"] as const;
export type JevBody = (typeof JEV_BODY)[number];

export const JEV_STYLES = [
  "fresh",
  "fruity",
  "mineral",
  "creamy",
  "tannic",
  "complex",
  "no_preference",
  "unknown",
] as const;
export type JevStyle = (typeof JEV_STYLES)[number];

export const JEV_USER_INTENTS = [
  "discover",
  "compare",
  "buy",
  "gift",
  "learn",
  "unknown",
] as const;
export type JevUserIntent = (typeof JEV_USER_INTENTS)[number];

export const JEV_FOOD_STRENGTHS = [
  "incidental",
  "relevant",
  "central",
  "unknown",
] as const;
export type JevFoodStrength = (typeof JEV_FOOD_STRENGTHS)[number];

/**
 * Structured understanding of one Romanian (or English) wine request.
 *
 * `unknown` means "the user did not say". It is never treated as a preference
 * and never converted into a wine fact.
 */
export interface JevIntent {
  occasion: JevOccasion;
  foodPairing: boolean | null;
  foodPairingStrength: JevFoodStrength;
  foodCategory: JevFoodCategory;
  color: JevWineColor;
  sweetness: JevSweetness;
  acidity: JevIntensity;
  body: JevBody;
  style: JevStyle;
  userIntent: JevUserIntent;
  /** User named one or more specific wines, grapes or producers. */
  specificProductRequest: boolean | null;
  /** User explicitly excluded a property (e.g. "not too acidic"). */
  hasExclusions: boolean | null;
  /** Per-field calibrated confidence reported by Jev (0..1). */
  confidence: JevIntentConfidence;
  /** Fields Jev answered with a concrete, above-threshold value. */
  confidentFields: JevIntentField[];
}

export const JEV_INTENT_FIELDS = [
  "occasion",
  "foodPairing",
  "foodPairingStrength",
  "foodCategory",
  "color",
  "sweetness",
  "acidity",
  "body",
  "style",
  "userIntent",
  "specificProductRequest",
  "hasExclusions",
] as const;

export type JevIntentField = (typeof JEV_INTENT_FIELDS)[number];

export type JevIntentConfidence = Record<JevIntentField, number>;

/** Token usage reported by the API, when available. */
export interface JevUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface JevCallMeta {
  model: string;
  mode: "shadow" | "live";
  latencyMs: number;
  attempts: number;
  cache: "hit" | "miss" | "bypass";
  requestId: string | null;
  usage: JevUsage;
  /** Stable, non-reversible identifier for diagnostics. Never the raw message. */
  messageFingerprint: string;
  messageLength: number;
}

export type JevSkipReason = "mode_off" | "missing_api_key" | "empty_message";

export type JevFailureReason =
  | "timeout"
  | "auth"
  | "rate_limited"
  | "network"
  | "invalid_response"
  | "invalid_request"
  | "http_error"
  | "aborted"
  | "saturated"
  | "unknown";

export type JevIntentOutcome =
  | { status: "ok"; intent: JevIntent; meta: JevCallMeta }
  | { status: "skipped"; reason: JevSkipReason }
  | {
      status: "unavailable";
      reason: JevFailureReason;
      meta: Pick<JevCallMeta, "latencyMs" | "attempts" | "messageFingerprint"> & {
        status?: number;
      };
    };

/** Error type used by the transport. `message` never contains the API key. */
export class JevError extends Error {
  readonly reason: JevFailureReason;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    reason: JevFailureReason,
    message: string,
    options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "JevError";
    this.reason = reason;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}
