import type { PriceAuditWine, RecoveredOffer } from "@/lib/affiliate-pricing";
import { recoverAffiliateOffer } from "@/lib/affiliate-pricing";

export interface AffiliatePriceTarget {
  wine: PriceAuditWine & { vintage: number | null };
  offer: RecoveredOffer;
}

export interface PriceRefreshObservation {
  priceRon: number;
  currency: "RON";
  inStock: boolean | null;
  observedAt: string;
  finalUrl: string;
  /** Recovered from the merchant page only when the page publishes it. */
  vintage?: number | null;
}

export interface PriceRefreshFetcher {
  /** Confirm the affiliate URL redirects to the exact merchant product. */
  verifyAffiliateDestination(target: AffiliatePriceTarget): Promise<boolean>;
  /** Fetch a live price from the merchant product URL, never from history. */
  fetchObservation(target: AffiliatePriceTarget): Promise<PriceRefreshObservation | null>;
}

export interface PriceRefreshStore {
  acquireLock(token: string, ttlMs: number): Promise<boolean>;
  releaseLock(token: string): Promise<void>;
  getCursor(): Promise<number>;
  setCursor(cursor: number): Promise<void>;
  loadTargets(cursor: number, limit: number): Promise<AffiliatePriceTarget[]>;
  startRun(input: {
    token: string;
    startedAt: string;
    dryRun: boolean;
    cursorStart: number;
  }): Promise<number | null>;
  finishRun(input: {
    runId: number;
    status: "success" | "failed" | "locked";
    finishedAt: string;
    cursorEnd: number | null;
    processed: number;
    updated: number;
    unchanged: number;
    failed: number;
    skipped: number;
    errors: Record<string, unknown>[];
  }): Promise<void>;
  applyObservation(input: {
    target: AffiliatePriceTarget;
    observation: PriceRefreshObservation;
  }): Promise<{ priceChanged: boolean }>;
  recordFailure?(input: {
    target: AffiliatePriceTarget;
    error: string;
    at: string;
  }): Promise<void>;
}

export interface PriceRefreshResult {
  status: "success" | "failed" | "locked";
  runId: number | null;
  cursorStart: number;
  cursorEnd: number | null;
  processed: number;
  updated: number;
  unchanged: number;
  failed: number;
  skipped: number;
  errors: Array<{ wineId: number; slug: string; code: string; message: string }>;
}

export interface RunPriceRefreshOptions {
  store: PriceRefreshStore;
  fetcher: PriceRefreshFetcher;
  lockToken: string;
  limit?: number;
  dryRun?: boolean;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  lockTtlMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
  requestDelayMs?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 40;
const DEFAULT_LOCK_TTL_MS = 15 * 60 * 1000;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boundLimit(limit: number | undefined): number {
  if (!Number.isInteger(limit) || (limit ?? 0) <= 0) return DEFAULT_LIMIT;
  return Math.min(limit!, MAX_LIMIT);
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: { attempts: number; backoffMs: number; sleep: (ms: number) => Promise<void> },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === options.attempts) break;
      await options.sleep(options.backoffMs * 2 ** (attempt - 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * One resumable, non-overlapping price-refresh batch. The store owns the
 * persistent cursor and lock; the fetcher owns only live merchant requests.
 */
export async function runPriceRefreshBatch(
  options: RunPriceRefreshOptions,
): Promise<PriceRefreshResult> {
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? defaultSleep;
  const limit = boundLimit(options.limit);
  const dryRun = options.dryRun ?? false;
  const startedAt = now().toISOString();
  const locked = await options.store.acquireLock(
    options.lockToken,
    options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS,
  );
  if (!locked) {
    return {
      status: "locked",
      runId: null,
      cursorStart: await options.store.getCursor(),
      cursorEnd: null,
      processed: 0,
      updated: 0,
      unchanged: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };
  }

  const cursorStart = await options.store.getCursor();
  const runId = await options.store.startRun({
    token: options.lockToken,
    startedAt,
    dryRun,
    cursorStart,
  });

  let processed = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  let skipped = 0;
  let cursorEnd: number | null = cursorStart;
  const errors: PriceRefreshResult["errors"] = [];

  try {
    const targets = await options.store.loadTargets(cursorStart, limit);
    for (const [index, target] of targets.entries()) {
      processed += 1;
      const prefix = `${target.wine.slug} (${target.offer.merchantProductId})`;
      try {
        const destinationMatches = await withRetry(
          () => options.fetcher.verifyAffiliateDestination(target),
          {
            attempts: options.maxAttempts ?? 3,
            backoffMs: options.backoffMs ?? 500,
            sleep,
          },
        );
        if (!destinationMatches) {
          throw new Error(`affiliate_destination_mismatch:${prefix}`);
        }

        const observation = await withRetry(
          () => options.fetcher.fetchObservation(target),
          {
            attempts: options.maxAttempts ?? 3,
            backoffMs: options.backoffMs ?? 500,
            sleep,
          },
        );
        if (!observation) {
          skipped += 1;
        } else if (!dryRun) {
          const { priceChanged } = await options.store.applyObservation({
            target,
            observation,
          });
          if (priceChanged) updated += 1;
          else unchanged += 1;
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          wineId: target.wine.id,
          slug: target.wine.slug,
          code: "refresh_failed",
          message,
        });
        await options.store.recordFailure?.({
          target,
          error: message,
          at: now().toISOString(),
        });
      }

      cursorEnd = target.wine.id;
      if (index < targets.length - 1 && (options.requestDelayMs ?? 0) > 0) {
        await sleep(options.requestDelayMs!);
      }
    }

    if (targets.length < limit) {
      cursorEnd = 0;
    } else {
      cursorEnd = targets.at(-1)?.wine.id ?? 0;
    }
    if (!dryRun) await options.store.setCursor(cursorEnd);

    await options.store.finishRun({
      runId: runId ?? 0,
      status: "success",
      finishedAt: now().toISOString(),
      cursorEnd,
      processed,
      updated,
      unchanged,
      failed,
      skipped,
      errors,
    });

    return {
      status: "success",
      runId,
      cursorStart,
      cursorEnd,
      processed,
      updated,
      unchanged,
      failed,
      skipped,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await options.store.finishRun({
      runId: runId ?? 0,
      status: "failed",
      finishedAt: now().toISOString(),
      cursorEnd,
      processed,
      updated,
      unchanged,
      failed: failed + 1,
      skipped,
      errors: [...errors, { slug: "batch", code: "batch_failed", message }],
    });
    return {
      status: "failed",
      runId,
      cursorStart,
      cursorEnd,
      processed,
      updated,
      unchanged,
      failed: failed + 1,
      skipped,
      errors: [
        ...errors,
        { wineId: 0, slug: "batch", code: "batch_failed", message },
      ],
    };
  } finally {
    await options.store.releaseLock(options.lockToken);
  }
}

export function recoverTargets(
  wines: Array<PriceAuditWine & { vintage: number | null }>,
): AffiliatePriceTarget[] {
  return wines
    .map((wine) => {
      const audit = recoverAffiliateOffer(wine);
      return audit.offer ? { wine, offer: audit.offer } : null;
    })
    .filter((target): target is AffiliatePriceTarget => target != null);
}
