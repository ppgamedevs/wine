import "../lib/load-env";
import { db } from "../lib/db";
import { resolvePublicPrice } from "../lib/public-price";
import { isQualifyingProfitshareUrl } from "../lib/retailer-links";

interface AuditRow {
  id: number;
  slug: string;
  name: string;
  vintage: number | null;
  currentPrice: number | null;
  priceAvg: number | null;
  affiliateLinks: { retailer: string; url: string; priceRon?: number; checkedAt?: string; inStock?: boolean }[];
  priceHistory: { date: string; price: number; source: string }[];
}

function isFresh(value: string | undefined, now: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return now.getTime() - date.getTime() <= 48 * 60 * 60 * 1000;
}

async function main() {
  const now = new Date();
  const rows = (await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      vintage: true,
      currentPrice: true,
      priceAvg: true,
      affiliateLinks: true,
      priceHistory: true,
    },
  })) as AuditRow[];

  const summary = {
    totalWines: rows.length,
    withAnyStoredPrice: 0,
    withQualifiedPublicOffer: 0,
    storedPriceButNoQualifiedOffer: 0,
    strictProfitshareLinks: 0,
    nonProfitshareAffiliateLinks: 0,
    profitshareLinksMissingPriceOrCheckedAt: 0,
    staleProfitshareOffers: 0,
    sameOfferHistoryObservations: 0,
    noStorePriceAndNoQualifiedOffer: 0,
  };

  const samples: Record<string, string[]> = {
    storedPriceButNoQualifiedOffer: [],
    profitshareLinksMissingPriceOrCheckedAt: [],
    nonProfitshareAffiliateLinks: [],
  };

  for (const wine of rows) {
    const hasStoredPrice =
      (wine.currentPrice != null && wine.currentPrice > 0) ||
      (wine.priceAvg != null && wine.priceAvg > 0);
    const pricing = resolvePublicPrice(wine, { now });
    const links = wine.affiliateLinks ?? [];

    if (hasStoredPrice) summary.withAnyStoredPrice += 1;
    if (pricing.bestOffer) summary.withQualifiedPublicOffer += 1;
    else if (hasStoredPrice) summary.storedPriceButNoQualifiedOffer += 1;
    else summary.noStorePriceAndNoQualifiedOffer += 1;

    for (const link of links) {
      if (isQualifyingProfitshareUrl(link.url)) {
        summary.strictProfitshareLinks += 1;
        const hasOfferObservation =
          link.priceRon != null &&
          link.priceRon > 0 &&
          Boolean(link.checkedAt);
        if (!hasOfferObservation) {
          summary.profitshareLinksMissingPriceOrCheckedAt += 1;
          samples.profitshareLinksMissingPriceOrCheckedAt.push(wine.slug);
        } else if (!isFresh(link.checkedAt, now)) {
          summary.staleProfitshareOffers += 1;
        }
      } else {
        summary.nonProfitshareAffiliateLinks += 1;
        samples.nonProfitshareAffiliateLinks.push(wine.slug);
      }
    }

    const strictHistory = (wine.priceHistory ?? []).filter((entry) =>
      isQualifyingProfitshareUrl(entry.source),
    );
    if (strictHistory.length > 0) summary.sameOfferHistoryObservations += 1;

    if (hasStoredPrice && !pricing.bestOffer) {
      samples.storedPriceButNoQualifiedOffer.push(wine.slug);
    }
  }

  const trim = (items: string[]) => [...new Set(items)].slice(0, 20);

  console.log(
    JSON.stringify(
      {
        policy: "public price requires fresh, exact-wine Profitshare offer",
        summary,
        samples: {
          storedPriceButNoQualifiedOffer: trim(
            samples.storedPriceButNoQualifiedOffer,
          ),
          profitshareLinksMissingPriceOrCheckedAt: trim(
            samples.profitshareLinksMissingPriceOrCheckedAt,
          ),
          nonProfitshareAffiliateLinks: trim(
            samples.nonProfitshareAffiliateLinks,
          ),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
