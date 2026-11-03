export interface SourceGap {
  field: string;
  preferredSources: string[];
  reason: string;
}

export interface SourceAttempt {
  key: string;
  sourceUrl: string;
  field: string;
  status: "success" | "failed" | "blocked" | "unavailable";
  attempts: number;
  lastAttemptAt: string;
  nextRetryAt: string | null;
  reason: string | null;
}

/**
 * Prevents repeated queries against the same unsuccessful source. A blocked
 * source is not retried; temporary failures use exponential cooldown.
 */
export class SourceAttemptCache {
  private readonly attempts = new Map<string, SourceAttempt>();

  key(sourceUrl: string, field: string): string {
    return `${sourceUrl}|${field}`;
  }

  record(input: {
    sourceUrl: string;
    field: string;
    status: SourceAttempt["status"];
    reason?: string | null;
    now?: Date;
  }): SourceAttempt {
    const previous = this.attempts.get(this.key(input.sourceUrl, input.field));
    const now = input.now ?? new Date();
    const attempts = (previous?.attempts ?? 0) + 1;
    const cooldownMinutes =
      input.status === "failed" ? Math.min(60 * 24, 5 * 2 ** (attempts - 1)) : null;
    const attempt: SourceAttempt = {
      key: this.key(input.sourceUrl, input.field),
      sourceUrl: input.sourceUrl,
      field: input.field,
      status: input.status,
      attempts,
      lastAttemptAt: now.toISOString(),
      nextRetryAt:
        cooldownMinutes == null
          ? null
          : new Date(now.getTime() + cooldownMinutes * 60_000).toISOString(),
      reason: input.reason ?? null,
    };
    this.attempts.set(attempt.key, attempt);
    return attempt;
  }

  shouldAttempt(sourceUrl: string, field: string, now = new Date()): boolean {
    const attempt = this.attempts.get(this.key(sourceUrl, field));
    if (!attempt) return true;
    if (attempt.status === "blocked") return false;
    if (attempt.status === "success") return false;
    if (attempt.nextRetryAt == null) return true;
    return now.getTime() >= Date.parse(attempt.nextRetryAt);
  }

  list(): SourceAttempt[] {
    return [...this.attempts.values()];
  }
}

export function informationGainPriority(gap: SourceGap): number {
  if (gap.field === "alcohol") return 100;
  if (gap.field === "source_url" || gap.field === "producer_source") return 90;
  if (gap.field === "serving_temperature") return 80;
  if (gap.field === "tasting_notes") return 75;
  if (gap.field === "grape_varieties" || gap.field === "region") return 70;
  return 40;
}

export function planSourceGaps(
  gaps: SourceGap[],
  options: { attempted?: SourceAttemptCache; now?: Date } = {},
): Array<SourceGap & { priority: number; sourceUrl: string | null; retryAllowed: boolean }> {
  const now = options.now ?? new Date();
  return gaps
    .map((gap) => {
      const sourceUrl = gap.preferredSources[0] ?? null;
      const retryAllowed = sourceUrl
        ? (options.attempted?.shouldAttempt(sourceUrl, gap.field, now) ?? true)
        : true;
      return {
        ...gap,
        priority: informationGainPriority(gap),
        sourceUrl,
        retryAllowed,
      };
    })
    .sort((left, right) => right.priority - left.priority);
}
