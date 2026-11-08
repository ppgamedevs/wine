import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inferBottleSizeMl } from "@/lib/public-price";
import { extractProductFromUrl } from "@/lib/price-extractor";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { recalculateSingleWineValueScore } from "@/lib/recalculate-value-scores";
import {
  priceRefreshRuns,
  priceRefreshState,
  wines,
  type AffiliateLink,
  type PriceHistoryEntry,
} from "@/lib/schema";
import {
  extractEmagProductId,
  recoverAffiliateOffers,
  type PriceAuditWine,
} from "@/lib/affiliate-pricing";
import type {
  AffiliatePriceTarget,
  PriceRefreshFetcher,
  PriceRefreshObservation,
  PriceRefreshStore,
} from "@/lib/price-refresh";

const STATE_KEY = "affiliate-price-refresh";
const HISTORY_RETENTION_DAYS = 90;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pruneHistory(
  history: PriceHistoryEntry[],
  now: Date,
): PriceHistoryEntry[] {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - HISTORY_RETENTION_DAYS);
  return history.filter((entry) => {
    const date = parseDate(entry.date);
    return date != null && date >= cutoff;
  });
}

function stockFromHtml(html: string): boolean | null {
  const normalized = html.toLowerCase();
  if (
    /stoc epuizat|stoc indisponibil|indisponibil|out of stock|currently unavailable/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (/în stoc|in stoc|available|disponibil/.test(normalized)) return true;
  return null;
}

function sameProduct(finalUrl: string, expectedId: string): boolean {
  return extractEmagProductId(finalUrl) === expectedId.toUpperCase();
}

export class DbPriceRefreshStore implements PriceRefreshStore {
  async acquireLock(token: string, ttlMs: number): Promise<boolean> {
    const now = new Date();
    const expires = new Date(now.getTime() + ttlMs).toISOString();
    try {
      await db
        .insert(priceRefreshState)
        .values({
          key: STATE_KEY,
          cursor: 0,
          updatedAt: now.toISOString(),
        })
        .onConflictDoNothing();

      const rows = await db
        .update(priceRefreshState)
        .set({
          lockToken: token,
          lockExpiresAt: expires,
          lastStartedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })
        .where(
          and(
            eq(priceRefreshState.key, STATE_KEY),
            sql`(${priceRefreshState.lockToken} IS NULL OR ${priceRefreshState.lockExpiresAt} IS NULL OR ${priceRefreshState.lockExpiresAt} < ${now.toISOString()})`,
          ),
        )
        .returning({ id: priceRefreshState.id });
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  async releaseLock(token: string): Promise<void> {
    await db
      .update(priceRefreshState)
      .set({ lockToken: null, lockExpiresAt: null, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(priceRefreshState.key, STATE_KEY),
          eq(priceRefreshState.lockToken, token),
        ),
      );
  }

  async getCursor(): Promise<number> {
    const [state] = await db
      .select({ cursor: priceRefreshState.cursor })
      .from(priceRefreshState)
      .where(eq(priceRefreshState.key, STATE_KEY))
      .limit(1);
    return state?.cursor ?? 0;
  }

  async setCursor(cursor: number): Promise<void> {
    await db
      .update(priceRefreshState)
      .set({ cursor, updatedAt: new Date().toISOString() })
      .where(eq(priceRefreshState.key, STATE_KEY));
  }

  async loadTargets(cursor: number, limit: number): Promise<AffiliatePriceTarget[]> {
    // Scan past wines without qualifying affiliate URLs. A fixed limit*3 query
    // would otherwise repeat the first non-eligible page forever.
    const targets: AffiliatePriceTarget[] = [];
    const pageSize = Math.max(50, limit * 3);
    let scannedThrough = cursor;
    const freshnessCutoff = Date.now() - 23 * 60 * 60 * 1000;

    while (targets.length < limit) {
      const rows = await db.query.wines.findMany({
        where: and(
          eq(wines.status, "verified"),
          isNotNull(wines.affiliateLinks),
          gt(wines.id, scannedThrough),
        ),
        columns: {
          id: true,
          slug: true,
          name: true,
          status: true,
          sourceUrl: true,
          producerPageUrl: true,
          currentPrice: true,
          priceAvg: true,
          priceHistory: true,
          affiliateLinks: true,
          vintage: true,
        },
        orderBy: [asc(wines.id)],
        limit: pageSize,
      });
      if (rows.length === 0) break;

      for (const row of rows) {
        scannedThrough = row.id;
        const auditWine: PriceAuditWine = {
          id: row.id,
          slug: row.slug,
          name: row.name,
          status: row.status,
          sourceUrl: row.sourceUrl,
          producerPageUrl: row.producerPageUrl,
          currentPrice: row.currentPrice,
          priceAvg: row.priceAvg,
          priceHistory: row.priceHistory ?? [],
          affiliateLinks: row.affiliateLinks ?? [],
        };
        // Finish every offer belonging to this wine before advancing the wine ID.
        // Otherwise the cursor would skip an additional retailer offer.
        for (const offer of recoverAffiliateOffers(auditWine)) {
          const linked = row.affiliateLinks?.find(
            (link) =>
              link.url === offer.affiliateUrl &&
              link.merchantProductId?.toUpperCase() ===
                offer.merchantProductId.toUpperCase(),
          );
          const checkedAt = linked?.checkedAt
            ? new Date(linked.checkedAt).getTime()
            : NaN;
          if (
            linked?.verificationStatus === "verified" &&
            Number.isFinite(checkedAt) &&
            checkedAt >= freshnessCutoff
          ) {
            continue;
          }
          targets.push({ wine: { ...auditWine, vintage: row.vintage }, offer });
        }
        if (targets.length >= limit) break;
      }

      if (rows.length < pageSize) break;
    }

    return targets;
  }

  async startRun(input: {
    token: string;
    startedAt: string;
    dryRun: boolean;
    cursorStart: number;
  }): Promise<number | null> {
    try {
      const [run] = await db
        .insert(priceRefreshRuns)
        .values({
          startedAt: input.startedAt,
          status: "running",
          dryRun: input.dryRun,
          cursorStart: input.cursorStart,
          lockToken: input.token,
        })
        .returning({ id: priceRefreshRuns.id });
      return run?.id ?? null;
    } catch {
      return null;
    }
  }

  async finishRun(input: {
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
  }): Promise<void> {
    if (input.runId <= 0) return;
    await db
      .update(priceRefreshRuns)
      .set({
        finishedAt: input.finishedAt,
        status: input.status,
        cursorEnd: input.cursorEnd,
        processed: input.processed,
        updated: input.updated,
        unchanged: input.unchanged,
        failed: input.failed,
        skipped: input.skipped,
        errorJson: input.errors,
      })
      .where(eq(priceRefreshRuns.id, input.runId));

    await db
      .update(priceRefreshState)
      .set({
        lastFinishedAt: input.finishedAt,
        ...(input.status === "success" ? { lastSuccessAt: input.finishedAt } : {}),
        lastError: input.errors.length > 0 ? JSON.stringify(input.errors) : null,
        updatedAt: input.finishedAt,
      })
      .where(eq(priceRefreshState.key, STATE_KEY));
  }

  async applyObservation(input: {
    target: AffiliatePriceTarget;
    observation: PriceRefreshObservation;
  }): Promise<{ priceChanged: boolean }> {
    const wine = await db.query.wines.findFirst({
      where: eq(wines.id, input.target.wine.id),
      columns: {
        id: true,
        slug: true,
        name: true,
        priceHistory: true,
        affiliateLinks: true,
        currentPrice: true,
        vintage: true,
      },
    });
    if (!wine) throw new Error("wine_not_found");

    // A successfully verified live Profitshare redirect can safely upgrade a
    // legacy direct-eMAG affiliate record. Old imports did not store the
    // merchantProductId required by the previous implementation.
    const productId = input.target.offer.merchantProductId.toUpperCase();
    const affiliateUrl = input.target.offer.affiliateUrl;
    const exactIndex = wine.affiliateLinks.findIndex(
      (candidate) =>
        candidate.url === affiliateUrl &&
        (candidate.merchantProductId?.toUpperCase() === productId ||
          extractEmagProductId(candidate.merchantUrl) === productId),
    );
    const legacyIndex = wine.affiliateLinks.findIndex(
      (candidate) =>
        extractEmagProductId(candidate.url) === productId,
    );
    const index = exactIndex >= 0 ? exactIndex : legacyIndex;
    const link = index >= 0 ? wine.affiliateLinks[index] : undefined;
    const now = new Date(input.observation.observedAt);
    const previous = link?.priceRon ?? null;
    const updatedLink: AffiliateLink = {
      ...(link ?? { retailer: "eMAG.ro" }),
      url: affiliateUrl,
      merchantUrl: input.target.offer.merchantUrl,
      merchantProductId: productId,
      productKey: wine.slug,
      wineSlug: wine.slug,
      bottleSizeMl: inferBottleSizeMl(wine.name) ?? undefined,
      vintage: wine.vintage,
      priceRon: input.observation.priceRon,
      currency: "RON",
      checkedAt: input.observation.observedAt,
      inStock: input.observation.inStock ?? link?.inStock,
      verificationStatus: "verified",
      verifiedAt: input.observation.observedAt,
      verificationError: undefined,
    };
    const links = index >= 0
      ? wine.affiliateLinks.map((candidate, i) => i === index ? updatedLink : candidate)
      : [...wine.affiliateLinks, updatedLink];
    const history = pruneHistory(
      [
        ...(wine.priceHistory ?? []),
        {
          date: input.observation.observedAt,
          price: input.observation.priceRon,
          source: link.url,
        },
      ],
      now,
    );

    await db
      .update(wines)
      .set({
        currentPrice: input.observation.inStock === false ? wine.currentPrice : input.observation.priceRon,
        priceAvg: input.observation.priceRon,
        priceHistory: history,
        affiliateLinks: links,
        ...(wine.vintage == null && input.observation.vintage != null
          ? { vintage: input.observation.vintage }
          : {}),
      })
      .where(eq(wines.id, wine.id));

    const priceChanged = previous !== input.observation.priceRon;
    if (priceChanged && input.observation.inStock !== false) {
      try {
        await recalculateSingleWineValueScore(wine.id, {
          priceOverride: input.observation.priceRon,
          changeReason: "price_update",
        });
      } catch {
        // The observation is still persisted; a separate score job can retry.
      }
    }
    return { priceChanged };
  }

  async recordFailure(input: {
    target: AffiliatePriceTarget;
    error: string;
    at: string;
  }): Promise<void> {
    void input;
    // Failure is recorded in the run ledger. The last verified observation is
    // deliberately preserved; no fabricated current price is written.
  }
}

export const dbPriceRefreshFetcher: PriceRefreshFetcher = {
  async verifyAffiliateDestination(target) {
    const page = await fetchPageWithResolution(target.offer.affiliateUrl);
    return sameProduct(page.finalUrl, target.offer.merchantProductId);
  },

  async fetchObservation(target) {
    const page = await fetchPageWithResolution(target.offer.merchantUrl);
    if (!sameProduct(page.finalUrl, target.offer.merchantProductId)) {
      throw new Error("merchant_product_identity_mismatch");
    }
    const extracted = await extractProductFromUrl(target.offer.merchantUrl, {
      allowLlm: false,
      html: page.html,
      finalUrl: page.finalUrl,
    });
    if (extracted.price == null) return null;
    return {
      priceRon: extracted.price,
      currency: "RON",
      inStock: stockFromHtml(page.html),
      observedAt: new Date().toISOString(),
      finalUrl: page.finalUrl,
      vintage: extracted.vintage,
    };
  },
};

export async function readPriceRefreshStatus() {
  try {
    const [state] = await db
      .select()
      .from(priceRefreshState)
      .where(eq(priceRefreshState.key, STATE_KEY))
      .limit(1);
    const runs = await db
      .select()
      .from(priceRefreshRuns)
      .orderBy(sql`${priceRefreshRuns.id} DESC`)
      .limit(20);
    return { state: state ?? null, runs };
  } catch {
    return { state: null, runs: [], unavailable: true as const };
  }
}
