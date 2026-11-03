# Multi-Source Wine Intelligence V2

## What was audited

- `lib/tech-facts/*`: existing claim extraction, source identity, reconciliation,
  qualification, PDF classification, evidence persistence and retry/cache logic.
- `lib/source-trust.ts`: producer/retailer/technical source ranking.
- `lib/wine-producer-enrichment.ts`, `lib/analyze-wine-service.ts` and the
  Murfatlar producer parser/ingestion.
- `wine_fact_evidence` (migration 0025/0026) and the existing technical recovery
  and source-adjudication scripts.
- Existing retailer discovery and price handling, including the Profitshare-only
  public-price resolver from Prompt 1.

The V2 layer reuses these instead of replacing them:

- existing identity/reconciliation vocabulary (`IdentityMatchClass`,
  `wine_fact_evidence`, source trust);
- existing Murfatlar bounded variant parser for producer facts;
- existing Profitshare-only public price firewall;
- existing `wine_fact_evidence` for technical mirrors.

## Architecture

```
WineIntelligenceInput
  → source discovery (classify, robots/access, PDF discovery)
  → per-source bounded extraction (independent claims)
  → claim evidence ledger (source URL, excerpt, date, method, identity, confidence)
  → reconciliation (official priority, conflict preservation, copy detection)
  → completeness report
  → AI interpretation (separate from source claims)
  → dry-run mutation plan OR explicit persistence
```

### New modules

| Module | Responsibility |
|---|---|
| `lib/intelligence/types.ts` | claim/evidence/report schemas and field groups |
| `lib/intelligence/source-discovery.ts` | source classes, PDF discovery, robots/access status, existing record |
| `lib/intelligence/claim-extraction.ts` | bounded per-source claims for all requested fields |
| `lib/intelligence/reconcile.ts` | official priority, conflict preservation, copy independence, completeness |
| `lib/intelligence/variety-knowledge.ts` | separate general grape knowledge layer |
| `lib/intelligence/ai-enrichment.ts` | constrained interpretation, numeric/award guard, token/cost estimate |
| `lib/intelligence/pipeline.ts` | idempotent workflow, caching, retries, concurrency, dry-run/apply |
| `lib/intelligence/persist.ts` | new evidence ledger + technical mirror + AI/run rows |

### Migrations

`drizzle/0028_wine_intelligence_v2.sql` adds:

- `wine_claim_evidence` — every product-specific V2 claim, including sensory and
  descriptive evidence, with source/identity/verification/conflict fields;
- `grape_variety_knowledge` — separate general variety layer;
- `wine_ai_interpretations` — AI text kept separate from source claims;
- `wine_enrichment_runs` — fingerprint/idempotency, request counts, token/cost,
  completeness and errors.

`drizzle/meta/_journal.json` includes migration 28.

**No production migration was applied.** Controlled application:

```bash
# Review first; this changes the configured database only.
npx drizzle-kit migrate
```

Then seed the separate variety layer explicitly:

```bash
npx tsx scripts/seed-variety-knowledge.ts --apply
```

### Commands

```bash
# Default: dry-run, no DB mutation
npx tsx scripts/wine-intelligence-v2.ts --wine=418

# Write the full evidence/report JSON (still no DB mutation)
npx tsx scripts/wine-intelligence-v2.ts --wine=418 --out=docs/sample-evidence-murfatlar-zestrea.json

# Controlled application, only after migration and review
npx tsx scripts/wine-intelligence-v2.ts --wine=418 --apply
```

`--apply` is never invoked automatically. Dry-run is the default.

### Processing guarantees

- Source fixtures are cached by URL.
- Optional network loaders retry up to `maxRetries`; failures become actionable
  errors, not fabricated values.
- Available sources are processed with concurrency 2.
- The fingerprint combines wine identity, source URLs and claim hashes; rerunning
  the same input yields the same `runId` and upserts the ledger/run row.
- Existing IDs and slugs are not touched.
- Ambiguous/blocked/requires-auth sources remain unavailable.
- No authentication or anti-bot control is bypassed.

## Source evaluation for the target

The audited target is `Murfatlar Zestrea Muscat Ottonel Demisec 0.75L` (`wine_id 418`).

Available in this run:

| Class | Source | Status |
|---|---|---|
| official producer page | `https://murfatlar-vinul.ro/zestrea/` | available (fixture) |
| retailer (factual only) | Auchan product page | available (fixture) |
| existing VinIntel record | local wine 418 record | available |

The discovery layer also handles official technical sheets/PDFs, producer
catalogues, specialist resources, education and independent editorial sources.
For this fixture run no official technical PDF or extra independent source was
available; they are reported as unavailable rather than invented. This is
deliberate: quantity of links is not quality of evidence.

## Claim coverage

V2 supports:

- producer/range/product, grape varieties and percentages, vintage, volume,
  colour, sweetness, alcohol, appellation, region/country;
- serving temperature, visual appearance, aroma descriptors, taste descriptors,
  body, acidity, tannin, finish;
- winemaking, oak, food pairing, awards, cellaring, allergens and other product
  information.

All values are source-excerpt backed. Numeric values are never inferred from
general knowledge.

## Reconciliation rules

1. Exact official technical sheet or producer page is preferred over retailer,
   specialist, editorial and existing-record claims.
2. A retailer sensory claim is stored with attribution; it cannot override a
   contradictory official claim.
3. Disagreements are preserved in `conflict_json` and in the report. If two
   official sources disagree, no automatic value is chosen.
4. Two copies from the same host do not create `corroborated` status. Only
   independent official hosts with the same value can do that.
5. `verified_official`, `attributed_retailer`, `attributed_specialist`,
   `attributed_editorial`, `conflict`, `unverified` are distinct states.

## Variety layer

`getVarietyKnowledge("Muscat Ottonel")` returns history, typical aromas,
regions, styles, general food compatibility and common winemaking practices.

It is a separate data shape and table. It is never passed through
`reconcileClaims()` or copied into a bottle's tasting notes. For example,
`orange blossom` / `elderflower` are general Muscat characteristics, not verified
aromas of the 2026 Zestrea bottle.

## AI layer

AI receives **only reconciled, source-backed claims** and is prompted to explain
them. The output passes a numeric/award guard; unsupported numbers, vintages and
awards are rejected. AI output is stored in `wine_ai_interpretations`, separate
from `wine_claim_evidence`.

Dry-run cost report for the target:

- AI requests: 1
- Input tokens: ~402
- Output tokens: 420
- Estimated cost: **$0.000174**
- Source network requests in fixture mode: 0

## Pricing firewall

V2 has no price field and never extracts retailer prices. Public prices remain
owned exclusively by the qualified Profitshare resolver from Prompt 1. A
non-affiliate retailer is used only for factual claims and can never become a
public price.
