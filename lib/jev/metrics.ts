/**
 * Process-local observability for Jev.
 *
 * The application has no external metrics backend, so counters are kept in
 * memory (bounded) and also emitted as structured log lines. This is enough to
 * compare shadow interpretations with the deterministic engine on Vercel logs.
 * It is intentionally not persisted to the database.
 */

export type JevMetricOutcome = "ok" | "skipped" | "unavailable";

export interface JevObservation {
  outcome: JevMetricOutcome;
  /** Failure or skip reason, already sanitized. */
  reason?: string;
  mode: "off" | "shadow" | "live";
  cache: "hit" | "miss" | "bypass";
  latencyMs: number;
  attempts: number;
  usage?: { inputTokens: number | null; outputTokens: number | null };
  /** Fields Jev left ambiguous. */
  ambiguousFields?: string[];
  /** Fields whose wire answer was invalid. */
  invalidFields?: string[];
  /** Shadow comparison against the deterministic engine. */
  agreement?: "agree" | "disagree" | "not_compared";
}

export interface JevMetricsSnapshot {
  requests: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  fallbackRate: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  latencyMs: { p50: number; p95: number; max: number };
  tokens: { input: number; output: number };
  ambiguousClassifications: number;
  invalidFields: number;
  byReason: Record<string, number>;
  shadow: {
    runs: number;
    agreements: number;
    disagreements: number;
    agreementRate: number | null;
  };
}

const LATENCY_WINDOW = 500;

export class JevMetrics {
  private requests = 0;
  private attempted = 0;
  private succeeded = 0;
  private failed = 0;
  private skipped = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private inputTokens = 0;
  private outputTokens = 0;
  private ambiguousClassifications = 0;
  private invalidFields = 0;
  private readonly byReason = new Map<string, number>();
  private readonly latencies: number[] = [];
  private shadowRuns = 0;
  private shadowAgreements = 0;
  private shadowDisagreements = 0;

  record(observation: JevObservation): void {
    this.requests += 1;

    if (observation.cache === "hit") this.cacheHits += 1;
    if (observation.cache === "miss") this.cacheMisses += 1;

    if (observation.outcome === "ok") {
      this.succeeded += 1;
      if (observation.cache !== "hit") {
        this.attempted += 1;
        this.pushLatency(observation.latencyMs);
      }
    } else if (observation.outcome === "unavailable") {
      this.failed += 1;
      this.attempted += 1;
      this.pushLatency(observation.latencyMs);
    } else {
      this.skipped += 1;
    }

    if (observation.reason) {
      this.byReason.set(
        observation.reason,
        (this.byReason.get(observation.reason) ?? 0) + 1,
      );
    }

    if (observation.usage) {
      this.inputTokens += observation.usage.inputTokens ?? 0;
      this.outputTokens += observation.usage.outputTokens ?? 0;
    }

    this.ambiguousClassifications += observation.ambiguousFields?.length ?? 0;
    this.invalidFields += observation.invalidFields?.length ?? 0;

    if (observation.agreement) {
      this.shadowRuns += 1;
      if (observation.agreement === "agree") this.shadowAgreements += 1;
      if (observation.agreement === "disagree") this.shadowDisagreements += 1;
    }
  }

  private pushLatency(value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    this.latencies.push(Math.round(value));
    if (this.latencies.length > LATENCY_WINDOW) this.latencies.shift();
  }

  private percentile(p: number): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((left, right) => left - right);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
    );
    return sorted[index] ?? 0;
  }

  snapshot(): JevMetricsSnapshot {
    const compared = this.shadowAgreements + this.shadowDisagreements;
    return {
      requests: this.requests,
      attempted: this.attempted,
      succeeded: this.succeeded,
      failed: this.failed,
      skipped: this.skipped,
      fallbackRate:
        this.attempted === 0 ? 0 : Number((this.failed / this.attempted).toFixed(3)),
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate:
        this.cacheHits + this.cacheMisses === 0
          ? 0
          : Number(
              (
                this.cacheHits /
                (this.cacheHits + this.cacheMisses)
              ).toFixed(3),
            ),
      latencyMs: {
        p50: this.percentile(50),
        p95: this.percentile(95),
        max: this.latencies.reduce((max, value) => Math.max(max, value), 0),
      },
      tokens: { input: this.inputTokens, output: this.outputTokens },
      ambiguousClassifications: this.ambiguousClassifications,
      invalidFields: this.invalidFields,
      byReason: Object.fromEntries(this.byReason),
      shadow: {
        runs: this.shadowRuns,
        agreements: this.shadowAgreements,
        disagreements: this.shadowDisagreements,
        agreementRate:
          compared === 0
            ? null
            : Number((this.shadowAgreements / compared).toFixed(3)),
      },
    };
  }

  reset(): void {
    this.requests = 0;
    this.attempted = 0;
    this.succeeded = 0;
    this.failed = 0;
    this.skipped = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.ambiguousClassifications = 0;
    this.invalidFields = 0;
    this.byReason.clear();
    this.latencies.length = 0;
    this.shadowRuns = 0;
    this.shadowAgreements = 0;
    this.shadowDisagreements = 0;
  }
}

export const jevMetrics = new JevMetrics();

export function resetJevMetrics(): void {
  jevMetrics.reset();
}
