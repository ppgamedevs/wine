# Affiliate pricing and daily refresh audit

Production audit on 2026-11-08, followed by a controlled refresh that only recorded live verified observations. Historical prices were not deleted.

## Current coverage

| Metric | Count |
|---|---:|
| Wines in catalog | 273 |
| Verified wines | 270 |
| Wines with a producer page URL | 258 |
| Wines with an exact eMAG product URL | 97 |
| Wines with a Profitshare URL | 95 |
| Wines with any stored price | 183 |
| Wines missing a usable price observation | 176 |
| **Wines with a current public price** | **69** |
| Recoverable existing offers | 80 |
| Needs manual link correction | 15 |
| Genuinely unavailable | 178 |
| Legacy direct-eMAG / Profitshare swaps | 14 |
| Stale observations | 18 |

The 183 stored prices are not public coverage: many lack a fresh `checkedAt` on
the affiliate link, and the strict resolver correctly refuses them. The public
resolver reported zero current offers before the controlled recovery.

## Reconciliation after recovery

| Bucket | Wines |
|---|---:|
| Current verified public price | 69 |
| Verified identity, currently out of stock | 9 |
| Identity recoverable, refresh pending | 2 |
| Manual link correction queue | 15 |
| No exact affiliate pair | 178 |
| **Total** | **273** |

The 80 `recoverable` rows are the sum of the first three buckets, not an
additional set. The admin queue lists the 15 manual cases with IDs and reasons.

## Why it was zero

The old import stored the **eMAG URL** in `affiliateLinks[].url` and often put the
**Profitshare URL** in `wine.sourceUrl`. The strict public resolver correctly
rejects an eMAG URL as an affiliate URL, but it could not see the relationship
between the two records. The imported price also had no per-offer `checkedAt`.

The recovery model treats the three URLs independently:

- `producerPageUrl` → winery facts;
- `affiliateLinks[].merchantUrl` → exact eMAG product and price observation;
- `affiliateLinks[].url` → Profitshare purchase URL.

The stable merchant identity is the eMAG `/pd/<ID>` token, not the wine slug.

## Recovery result

`scripts/repair-affiliate-pricing.ts` is dry-run by default. It produces 94
link-level recovery candidates across 94 wines, of which 80 pass the
exact-product audit. The remaining 15 need a producer URL or another manual
correction. The script never writes without `--apply --confirm-repair` and never
verifies a destination by guessing.

Example before/after:

```json
{
  "before": {
    "retailer": "eMAG.ro",
    "url": "https://www.emag.ro/vin-recas-explicit-roze-0-75l-rec-260/pd/D4BLPY2BM/",
    "priceRon": 51
  },
  "after": {
    "retailer": "eMAG.ro",
    "url": "https://l.profitshare.ro/l/16139555",
    "merchantUrl": "https://www.emag.ro/vin-recas-explicit-roze-0-75l-rec-260/pd/D4BLPY2BM/",
    "merchantProductId": "D4BLPY2BM",
    "productKey": "cramele-recas-explicit-roze-2025",
    "bottleSizeMl": 750,
    "currency": "RON",
    "verificationStatus": "unverified"
  }
}
```

The repaired link remains `unverified` until the daily job confirms that the
Profitshare redirect lands on the same eMAG product ID.

## Daily refresh design

- `price_refresh_state` stores the persistent cursor, lock token and last success.
- `price_refresh_runs` stores per-run counts and bounded error details.
- `price_refresh_state.key = affiliate-price-refresh` is a single lock row.
- Lock TTL is 15 minutes; a second run returns `locked` instead of overlapping.
- Batches are capped at 20 in the cron route and 40 in the CLI.
- Cursor resumes from the last wine ID and resets after the final short batch.
- Each target requires two live checks: affiliate destination and merchant
  product page. Both must resolve to the exact `/pd/<ID>`.
- Retries use exponential backoff, with three attempts by default.
- A failed extraction leaves the last verified observation untouched.
- Unchanged prices still refresh `checkedAt`; changed prices also recalculate
  Value Score.
- Out-of-stock links keep history but are excluded from public price display.
- Multiple independently mapped retailer links are supported per wine.
- No AI or historical price is used as a current observation.

Schedule: `/api/cron/price-refresh` every six hours, protected by
`Authorization: Bearer $CRON_SECRET`. `maxDuration = 60`. The 14-target batch
means the 80 identity-recoverable offers are revisited well inside a 24-hour cycle while
each request stays short.

Approximate operating cost for 80 recoverable offers: two requests per offer per
cycle, about 160 eMAG/Profitshare requests per full cycle. The four daily runs
use 120 invocations/month. At 14 targets per batch with 800 ms spacing, a batch
is well inside the 60 second Vercel limit. There is no paid retailer API in this
release.

## Admin

`/admin/price-refresh` shows current/out-of-stock/pending coverage, the manual
queue with exact IDs and reasons, obsolete editorial snapshots, the cursor, last start, last success, last error and
the last 20 runs with processed/updated/unchanged/failed counts.
