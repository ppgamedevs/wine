import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines, type AffiliateLink } from "../lib/schema";
import {
  evaluateSources,
  extractEmagProductId,
  normalizeEmagProductUrl,
  type PriceAuditWine,
} from "../lib/affiliate-pricing";
import { inferBottleSizeMl } from "../lib/public-price";

interface RepairReport {
  id: number;
  slug: string;
  action: "dry-run" | "applied" | "skipped";
  before: AffiliateLink[];
  after: AffiliateLink[];
  reason: string;
}

function buildRecoveredLink(
  wine: PriceAuditWine & { vintage: number | null },
  link: AffiliateLink,
  audit: ReturnType<typeof evaluateSources>,
): AffiliateLink | null {
  if (!audit.emagUrl || !audit.profitshareUrl || !audit.merchantProductId) {
    return null;
  }
  if (link.merchantUrl && link.url === audit.profitshareUrl) return link;
  const merchantUrl =
    normalizeEmagProductUrl(link.merchantUrl ?? link.url) ?? audit.emagUrl;
  const productId = extractEmagProductId(merchantUrl);
  if (!productId || productId !== audit.merchantProductId) return null;

  return {
    ...link,
    url: audit.profitshareUrl,
    merchantUrl,
    merchantProductId: productId,
    productKey: wine.slug,
    bottleSizeMl:
      link.bottleSizeMl ??
      inferBottleSizeMl(wine.name) ??
      inferBottleSizeMl(wine.slug) ??
      undefined,
    vintage: link.vintage ?? wine.vintage,
    currency: "RON",
    verificationStatus: "unverified",
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmed = process.argv.includes("--confirm-repair");
  if (apply && !confirmed) {
    throw new Error("Refusing to write without --apply --confirm-repair.");
  }

  const rows = await db.query.wines.findMany({
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
  });

  const report: RepairReport[] = [];
  for (const row of rows) {
    const wine: PriceAuditWine & { vintage: number | null } = {
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
      vintage: row.vintage,
    };
    const audit = evaluateSources(wine);
    if (!audit.legacyUrlSwap && !audit.recoverable) continue;

    let changed = false;
    const after = wine.affiliateLinks.map((link) => {
      const recovered = buildRecoveredLink(wine, link, audit);
      if (recovered && recovered !== link) changed = true;
      return recovered ?? link;
    });
    if (!changed && audit.offer) {
      const alreadyMapped = after.some(
        (link) =>
          link.merchantProductId === audit.offer?.merchantProductId &&
          link.url === audit.offer?.affiliateUrl,
      );
      if (!alreadyMapped) {
        after.push({
          retailer: "eMAG.ro",
          url: audit.offer.affiliateUrl,
          merchantUrl: audit.offer.merchantUrl,
          merchantProductId: audit.offer.merchantProductId,
          productKey: wine.slug,
          priceRon: audit.offer.priceRon ?? undefined,
          checkedAt: audit.offer.observedAt ?? undefined,
          bottleSizeMl:
            inferBottleSizeMl(wine.name) ??
            inferBottleSizeMl(wine.slug) ??
            undefined,
          vintage: wine.vintage,
          currency: "RON",
          verificationStatus: "unverified",
        });
        changed = true;
      }
    }
    if (!changed) continue;

    const entry: RepairReport = {
      id: wine.id,
      slug: wine.slug,
      action: apply ? "applied" : "dry-run",
      before: wine.affiliateLinks,
      after,
      reason: audit.legacyUrlSwap
        ? "swapped legacy eMAG URL into merchantUrl and Profitshare URL into url"
        : audit.offer
          ? "recovered merchant URL from price history"
          : "added exact merchant product identity",
    };
    report.push(entry);
    if (apply) {
      await db
        .update(wines)
        .set({ affiliateLinks: after })
        .where(eq(wines.id, wine.id));
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: !apply,
        note: "No network destination verification is performed here. Links remain unverified until the daily job validates the redirect.",
        recoverableLegacyLinks: report.length,
        recoveredWines: new Set(report.map((entry) => entry.id)).size,
        report,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
