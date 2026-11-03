import "server-only";

import { createHash } from "node:crypto";
import { TtlCache } from "@/lib/jev/cache";
import {
  JEV_PROMPT_VERSION,
  describeJevConfig,
  getJevConfig,
  type JevConfig,
} from "@/lib/jev/config";
import {
  ambiguousJevFields,
  buildJevIntent,
  compareJevWithDeterministic,
} from "@/lib/jev/intent";
import { logJevEvent } from "@/lib/jev/log";
import { jevMetrics, type JevMetrics, type JevObservation } from "@/lib/jev/metrics";
import {
  SOMMELIER_INTENT_QUESTIONS,
  parseSystemOneResponse,
  type ParsedJevAnswers,
} from "@/lib/jev/questions";
import { createJevTransport, type JevTransport } from "@/lib/jev/transport";
import {
  JevError,
  type JevIntent,
  type JevIntentOutcome,
  type JevUsage,
} from "@/lib/jev/types";
import type { SommelierInput } from "@/lib/sommelier-occasions";
import type { AppLocale } from "@/i18n/locale";

interface CachedEvaluation {
  intent: JevIntent;
  model: string;
  usage: JevUsage;
}

export interface JevDecisionServiceOptions {
  config: JevConfig;
  transport?: JevTransport;
  cache?: TtlCache<CachedEvaluation>;
  metrics?: JevMetrics;
  clock?: () => number;
}

export interface ClassifySommelierIntentInput {
  userMessage: string;
  locale?: AppLocale;
  /** When provided, shadow mode records agreement with the deterministic engine. */
  deterministic?: SommelierInput;
}

/**
 * Server-side decision service around Jev.
 *
 * One public method: classify a Sommelier request into structured intent.
 * Everything user-facing is additive: on any failure the caller keeps the
 * deterministic pipeline.
 */
export class JevDecisionService {
  readonly config: JevConfig;
  private readonly transport: JevTransport | null;
  private readonly cache: TtlCache<CachedEvaluation>;
  private readonly metrics: JevMetrics;
  private readonly clock: () => number;
  private inFlight = 0;

  constructor(options: JevDecisionServiceOptions) {
    this.config = options.config;
    this.cache =
      options.cache ??
      new TtlCache<CachedEvaluation>({
        ttlMs: options.config.cacheTtlMs,
        maxEntries: options.config.cacheMaxEntries,
      });
    this.metrics = options.metrics ?? jevMetrics;
    this.clock = options.clock ?? Date.now;
    this.transport =
      options.transport ??
      (options.config.apiKey
        ? createJevTransport({
            apiKey: options.config.apiKey,
            baseUrl: options.config.baseUrl,
            timeoutMs: options.config.timeoutMs,
            maxRetries: options.config.maxRetries,
          })
        : null);
  }

  /** Safe description for admin/health endpoints. Never includes the key. */
  describe(): Record<string, unknown> {
    return describeJevConfig(this.config);
  }

  async classifySommelierIntent(
    input: ClassifySommelierIntentInput,
  ): Promise<JevIntentOutcome> {
    const userMessage = input.userMessage.trim();
    const locale = input.locale ?? "ro";

    if (this.config.mode === "off") {
      this.metrics.record({
        outcome: "skipped",
        reason: "mode_off",
        mode: "off",
        cache: "bypass",
        latencyMs: 0,
        attempts: 0,
      });
      return { status: "skipped", reason: "mode_off" };
    }

    if (!userMessage) {
      return { status: "skipped", reason: "empty_message" };
    }

    if (!this.config.enabled || !this.transport) {
      logJevEvent("warn", "disabled_without_key", {
        mode: this.config.mode,
        hasApiKey: this.config.hasApiKey,
        warnings: this.config.warnings,
      });
      this.metrics.record({
        outcome: "skipped",
        reason: "missing_api_key",
        mode: this.config.mode,
        cache: "bypass",
        latencyMs: 0,
        attempts: 0,
      });
      return { status: "skipped", reason: "missing_api_key" };
    }

    const fingerprint = fingerprintMessage(userMessage);
    const cacheKey = [
      JEV_PROMPT_VERSION,
      this.config.model,
      locale,
      fingerprint,
    ].join("|");

    const cached = this.cache.get(cacheKey);
    if (cached) {
      const meta = {
        model: cached.model,
        mode: this.config.mode === "live" ? ("live" as const) : ("shadow" as const),
        latencyMs: 0,
        attempts: 0,
        cache: "hit" as const,
        requestId: null,
        usage: cached.usage,
        messageFingerprint: fingerprint,
        messageLength: userMessage.length,
      };
      this.recordOutcome(cached.intent, meta, input.deterministic, {
        outcome: "ok",
        reason: "cache_hit",
        mode: this.config.mode,
        cache: "hit",
        latencyMs: 0,
        attempts: 0,
        usage: cached.usage,
      });
      return { status: "ok", intent: cached.intent, meta };
    }

    if (this.inFlight >= this.config.maxConcurrent) {
      logJevEvent("warn", "request_saturated", {
        mode: this.config.mode,
        inFlight: this.inFlight,
        maxConcurrent: this.config.maxConcurrent,
        messageFingerprint: fingerprint,
      });
      this.metrics.record({
        outcome: "unavailable",
        reason: "saturated",
        mode: this.config.mode,
        cache: "bypass",
        latencyMs: 0,
        attempts: 0,
      });
      return {
        status: "unavailable",
        reason: "saturated",
        meta: { latencyMs: 0, attempts: 0, messageFingerprint: fingerprint },
      };
    }

    const started = this.clock();
    this.inFlight += 1;

    try {
      const result = await this.transport.call({
        model: this.config.model,
        state: {
          locale,
          user_request: userMessage.slice(0, this.config.maxStateChars),
        },
        questions: SOMMELIER_INTENT_QUESTIONS,
      });

      const parsed: ParsedJevAnswers = parseSystemOneResponse(result.body);
      const intent = buildJevIntent(parsed, this.config.minConfidence);

      this.cache.set(cacheKey, {
        intent,
        model: parsed.model,
        usage: parsed.usage,
      });

      const meta = {
        model: parsed.model,
        mode: this.config.mode === "live" ? ("live" as const) : ("shadow" as const),
        latencyMs: result.latencyMs,
        attempts: result.attempts,
        cache: "miss" as const,
        requestId: result.requestId,
        usage: parsed.usage,
        messageFingerprint: fingerprint,
        messageLength: userMessage.length,
      };

      this.recordOutcome(intent, meta, input.deterministic, {
        outcome: "ok",
        mode: this.config.mode,
        cache: "miss",
        latencyMs: result.latencyMs,
        attempts: result.attempts,
        usage: parsed.usage,
        ambiguousFields: ambiguousJevFields(intent),
        invalidFields: [...parsed.missing, ...parsed.invalid],
      });

      return { status: "ok", intent, meta };
    } catch (error) {
      const latencyMs = Math.max(0, this.clock() - started);
      const reason = error instanceof JevError ? error.reason : "unknown";
      const status = error instanceof JevError ? error.status : undefined;

      logJevEvent("warn", "evaluation_failed", {
        mode: this.config.mode,
        model: this.config.model,
        reason,
        status,
        latencyMs,
        messageFingerprint: fingerprint,
        messageLength: userMessage.length,
      });

      this.metrics.record({
        outcome: "unavailable",
        reason,
        mode: this.config.mode,
        cache: "bypass",
        latencyMs,
        attempts: 1,
      });

      return {
        status: "unavailable",
        reason,
        meta: {
          latencyMs,
          attempts: 1,
          messageFingerprint: fingerprint,
          ...(status != null ? { status } : {}),
        },
      };
    } finally {
      this.inFlight -= 1;
    }
  }

  private recordOutcome(
    intent: JevIntent,
    meta: {
      model: string;
      mode: "shadow" | "live";
      latencyMs: number;
      attempts: number;
      cache: "hit" | "miss" | "bypass";
      usage: JevUsage;
      messageFingerprint: string;
    },
    deterministic: SommelierInput | undefined,
    observation: JevObservation,
  ): void {
    const agreement = deterministic
      ? compareJevWithDeterministic(deterministic, intent)
      : { agreement: "not_compared" as const, disagreements: [] };

    this.metrics.record({
      ...observation,
      agreement: agreement.agreement,
    });

    logJevEvent("info", "evaluation_succeeded", {
      mode: this.config.mode,
      model: meta.model,
      cache: meta.cache,
      latencyMs: meta.latencyMs,
      attempts: meta.attempts,
      usage: meta.usage,
      confidentFields: intent.confidentFields,
      ambiguousFieldCount: ambiguousJevFields(intent).length,
      shadowAgreement: agreement.agreement,
      shadowDisagreements: agreement.disagreements,
      messageFingerprint: meta.messageFingerprint,
    });
  }
}

/** Non-reversible, stable identifier for dedupe and diagnostics. */
export function fingerprintMessage(message: string): string {
  return createHash("sha256")
    .update(message.normalize("NFC").trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

let singleton: JevDecisionService | null = null;

/** Process-level service used by the API route. */
export function getJevDecisionService(): JevDecisionService {
  if (!singleton) {
    singleton = new JevDecisionService({ config: getJevConfig() });
  }
  return singleton;
}

export function resetJevDecisionServiceForTests(): void {
  singleton = null;
}
