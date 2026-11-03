# Structured claim backfill plan

This is a **plan and copied-database proof**, not a production backfill.

## What is backfilled

Only these source-backed V2 fields:

- sensory: `visual_appearance`, `aroma_descriptors`, `taste_descriptors`,
  `body`, `acidity_perception`, `tannin_perception`, `finish`
- serving: `serving_temperature`
- culinary: `food_pairing`

Free text is never converted into a claim. Every candidate must have:

- an `http(s)` source URL;
- a source excerpt;
- a canonical identity key and an **exact** wine identity match
  (`EXACT_WINE_EXACT_VINTAGE` or `EXACT_WINE_UNDATED_SOURCE`);
- a source hash/claim hash and a non-empty excerpt;
- no unresolved reconciled conflict for the field.

`LIKELY_WINE` is deliberately excluded: it is reported as
`manual_review_LIKELY_WINE` and is never published automatically. Verification is
computed for each individual claim from its own source class, identity match and
excerpt. An official claim can be `verified_official`/`corroborated`; a retailer
claim is always `attributed_retailer`, even if its value matches a preferred
official value. A retailer claim never inherits another source's badge.

## Safety properties

- **Dry-run by default.** `--apply` additionally requires `--confirm-apply`.
- **Insert-only.** Existing `(wine_id, field, source_hash)` rows are never
  updated or deleted. A different existing value is reported and skipped.
- **Same-record preservation.** The write keeps the exact V2 claim's source,
  verification, unit and excerpt.
- **No technical mirror, AI text, score or price writes.** The backfill touches
  only `wine_claim_evidence`.
- **Idempotent key.** Repeated application of the same plan inserts zero rows.

## Copied-database proof

The migration validator created a sanitized clone of the production schema and
applied the actual 0028 migration through the Drizzle migrator. On that clone:

| Step | Result |
|---|---|
| Dry-run planned writes | **6** |
| Skipped | 5 (4 `vinintel://` existing-record claims without an HTTP source; 1 reconciled `taste_descriptors` conflict) |
| First apply | **6 inserted** |
| Second identical apply | **0 inserted** |
| `wine_claim_evidence` rows after both applies | **6** |
| Existing `wines` / `wineries` / `regions` / `grape_varieties` / `wine_fact_evidence` counts | **265 / 25 / 19 / 18 / 445**, unchanged |
| Core-table SHA-256 hashes after backfill | identical to the pre-backfill migration validation hashes (`c2282692…`, `b4229271…`, `a6ad625b…`, `28be04cd…`, `5f2dd3f1…`) |
| Production writes | **0** |

The six persisted claims are official producer-page evidence:
`serving_temperature`, `visual_appearance`, `aroma_descriptors`,
`acidity_perception`, `finish` and `food_pairing`. `taste_descriptors` is
deliberately not written because the report preserves a conflict instead of
guessing a winner.

## Commands

```bash
# Dry-run: report only
npx tsx scripts/structured-claims-backfill.ts --wine=418 --fixtures

# Apply on a reviewed/copied database only
npx tsx scripts/structured-claims-backfill.ts \
  --wine=418 --fixtures --apply --confirm-apply
```

The script refuses to run if `wine_claim_evidence` is missing. It requires
`--fixtures` for the audited target fixture; arbitrary catalog wines use the
live V2 path. The reviewed dry-run output is
[structured-claims-backfill-last-plan.json](structured-claims-backfill-last-plan.json).

## Production status

**Do not claim production completeness.** Migration 0028 has been validated on
the clone, but it has not been applied to production. Production
`wine_claim_evidence` is absent, so production structured sensory coverage
remains **0%** until migration and reviewed backfill are actually performed.
