# Production score regression audit

Read-only audit of the production database at `451a79c`. No production write was
executed during this audit.

## Headline findings

| Metric | Value |
|---|---:|
| Total wine rows | 268 |
| Verified wines | 265 |
| Wines with stored price | 180 |
| Wines with a qualified public price | **0** |
| Wines with `valueScore` | 264 |
| Wines with `estimatedQuality` | 109 |
| Wines with `qualityFinal` / `qualityEffective` | 61 |
| Empty `grapeVarieties` | 20 |
| Empty `foodPairings` | 238 |

The regression is not that scores were deleted. The scores remain in storage,
but public cards, detail pages and several rankings suppress `valueScore`
whenever no qualified Profitshare offer exists. With **0 qualified offers**, all
value scores became invisible at once.

## Price provenance audit

Command: `npx tsx scripts/audit-price-provenance.ts`

- Total wines: 268
- With any stored price: 180
- With a qualified public offer: **0**
- Stored price but no qualified offer: 180
- Strict Profitshare links: 39
- Profitshare links missing `priceRon` or `checkedAt`: **39**
- Non-Profitshare affiliate links: 165
- Stale Profitshare offers: 0
- Same-offer history observations: 0
- No stored price and no qualified offer: 88

The 39 Profitshare links are structurally qualifying URLs but do not contain a
usable price observation. That is why they fail closed. The 165 non-Profitshare
links are correctly rejected by the strict public-price policy.

## Premiat 750 ml audit

All three records exist:

| ID | Slug | Status | Price | Value | Grapes | Food pairings |
|---:|---|---|---:|---:|---|---|
| 421 | `murfatlar-premiat-eticheta-neagra-rosu-0-75l` | verified | null | null | empty | empty |
| 422 | `murfatlar-premiat-eticheta-neagra-alb-0-75l` | verified | null | null | empty | empty |
| 423 | `murfatlar-premiat-eticheta-neagra-roze-0-75l` | verified | null | null | empty | empty |

Additional defects found:

- `tastingNotes`, `foodPairingNotes` and `producerContent` contain mojibake
  sequences such as `RoÈ™u`, `roÈ™ie`, `tÃ¢nÄƒr`, `producÄƒtorului`.
- `sourceUrl` uses synthetic anchor fragments:
  - `#rosu-750ml`
  - `#alb-750ml`
  - `#roze-750ml`
  These are not real producer page anchors.
- The records were marked `verified` solely because the import script ran.
- No structured claims were written.
- No price or Profitshare offer exists, so `valueScore` correctly cannot be
  computed.

## Migration status

- `__drizzle_migrations` contains **28** applied entries.
- Latest applied timestamp is **1787148000000**, corresponding to migration
  **0027**.
- Migration **0028 (wine intelligence v2)** is not applied.
- Migration **0029 (PSEO question flywheel)** is not applied.
- Do not run `drizzle-kit push` against production without reviewing the
  migration history and taking a backup.

## Incomplete verified records

- No stored price: 88
- No `valueScore`: 3 (the Premiat rows)
- No `estimatedQuality`: 157
- No grape varieties: 19
- No food pairings: 235
- No tasting notes: 136
- No image: 3
- No affiliate link: 72

## Root cause

`lib/public-wine-card.ts` and `components/wines/wine-dual-scores.tsx` couple the
display of every VinIntel score to `buildWinePriceViewModel()`. That coupling is
wrong in one direction only:

- **Value Score** requires a fresh, exact-product Profitshare offer.
- **Quality Score** must be independent of price.

The correct state is not “no score”. It is:

- Quality known, price unavailable: show Quality Score and “Value unavailable”.
- Quality known, price available: show both.
- Quality insufficient: show “insufficient data”, never a numerical substitute.
- Stale or wrong-vintage offer: Value unavailable.

## Safe repair plan

1. Add a price-independent public Quality Score projection using stored
   `qualityFinal`, then `qualityEffective`, then a sufficiently evidenced
   `estimatedQuality`.
2. Keep Value Score locked to the existing strict Profitshare identity/freshness
   gate.
3. Update cards, detail pages, top lists, filters, FAQ, metadata and JSON-LD.
4. Ship the Premiat importer fix and a **dry-run** repair script for the three
   corrupted records.
5. Apply no migration and no data repair until the before/after report is
   reviewed and explicitly approved.
6. Re-run the price audit after fresh Profitshare observations exist.
7. Consider applying migration 0028 only after its production safety review;
   0029 is unrelated to the score incident.

## Premiat repair report

Dry run:

```bash
npx tsx scripts/repair-murfatlar-premiat-750ml.ts
```

No write occurs without both:

```bash
npx tsx scripts/repair-murfatlar-premiat-750ml.ts --apply --confirm-repair
```

The proposed repair:

- corrects Romanian diacritics;
- changes status from `verified` to `user_submitted`;
- replaces synthetic anchors with `?variant=` source identities;
- adds structured producer claims without inventing grape, alcohol or vintage;
- fills official food pairings and deterministic editorial copy;
- leaves `valueScore` null because no qualified price exists.
