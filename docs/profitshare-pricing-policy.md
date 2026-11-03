# Profitshare-only public pricing policy

## Business rule

VinIntel may collect wine facts from any legitimate public source. Public prices,
price history, price badges, purchase CTAs and price-based recommendations are
shown **only** when they come from a qualifying Profitshare offer for the exact
wine, variant, bottle size and vintage.

## Canonical resolver

`lib/public-price.ts` is the single source of truth for public pricing.

A price is public only when:

- the URL is an actual Profitshare campaign link (`https://l.profitshare.ro/l/<token>`
  or `/lr/<token>`), not a retailer URL with `ref=ps`, `emag_click_id` or UTM tags;
- the offer is attached to this exact wine (optional `wineSlug`, `bottleSizeMl`
  and `vintage` must match when present);
- `priceRon` is positive and belongs to that offer (or a price-history entry
  whose `source` is exactly the same Profitshare URL);
- `checkedAt` is at most 48 hours old (or a same-offer history observation is);
- `inStock` is not explicitly `false`;
- `retailer` is stored on the offer. The resolver never infers a merchant from a
  generic retailer URL.

Multiple qualified offers are returned individually and sorted by price. A
non-qualified price from retailer A is never combined with an affiliate link for
retailer B.

## Public behaviour without a qualified offer

- Price display: `Preț indisponibil` / `Price unavailable`.
- No price history, comparisons, price badges or estimated prices.
- No purchase CTA.
- No price in JSON-LD `Offer`, OpenGraph, metadata, FAQ, public APIs or search
  payloads.
- Value Score and overpricing risk are hidden because they depend on a market
  price. Price-independent ratings (for example food versatility and gift
  suitability where their own evidence exists) remain available.

Internal `currentPrice`, `priceAvg`, `priceHistory` and non-affiliate
`availability` rows are retained for research, enrichment and diagnostics. They
are not deleted.

## Data model (JSON columns, no SQL migration)

`AffiliateLink` optionally carries:

| Field | Purpose |
|---|---|
| `priceRon` | observed price for this exact offer |
| `checkedAt` | ISO observation timestamp |
| `inStock` | `false` removes the offer from public view |
| `offerId` | Profitshare token (derived from the URL when absent) |
| `productKey` | retailer/SKU identity |
| `bottleSizeMl` | must match the wine's bottle size when both exist |
| `vintage` | must match the wine vintage when both exist |
| `wineSlug` | must match the wine slug when present |

There is **no required SQL migration**: the fields live in the existing
`affiliate_links` JSON column. TypeScript accepts old rows because all new
fields are optional.

## Reconciliation of old records

Existing rows generally do **not** satisfy the new policy yet:

- affiliate links stored as clean eMAG URLs (not Profitshare);
- Profitshare links with no `checkedAt` or `priceRon`;
- `currentPrice` / `priceAvg` / `priceHistory` sourced from non-affiliate pages.

Run the read-only audit:

```bash
npm run price:provenance-audit
```

It reports counts and sample slugs. To qualify a record, attach a proven
Profitshare observation:

```json
{
  "retailer": "eMAG.ro",
  "url": "https://l.profitshare.ro/l/16919669",
  "priceRon": 65,
  "checkedAt": "2026-11-03T10:00:00.000Z",
  "inStock": true,
  "offerId": "16919669",
  "productKey": "DFNRD8YBM",
  "bottleSizeMl": 750
}
```

Only do this after confirming that the Profitshare link resolves to the exact
product and that the price was observed for that offer. Do not copy a clean
retailer price onto a Profitshare link.

Alternative: record a price-history entry whose `source` is exactly the same
Profitshare URL. The resolver treats that as a same-offer observation.

## Rollback

- The change is application-only. Reverting the feature branch restores the old
  display behaviour.
- No database columns or rows are dropped or rewritten by this change.
- The optional JSON fields can remain in place; old code ignores them.
- If a backfill is later applied, retain a snapshot/export of the affected
  `affiliate_links` values before writing. Rollback is restoring that export.

## Tests

`lib/public-price.test.ts` covers:

- fresh eMAG Profitshare link + matching price: visible;
- non-affiliate Auchan price: unavailable;
- non-affiliate price + unrelated Profitshare link: unavailable;
- generic tracked URL: unavailable;
- Profitshare link without price: unavailable;
- stale Profitshare price: unavailable;
- old `currentPrice` without a qualifying offer: unavailable;
- multiple merchants: only qualified offers, sorted;
- mismatched bottle size/vintage and unavailable offers: rejected;
- public projection removes non-qualified prices and price-dependent scores;
- JSON-LD omits `offers` without a qualified offer.
