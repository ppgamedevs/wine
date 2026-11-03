# Wine Catalog Quality Engine

## Audit and reuse

The engine is an additive layer over existing systems:

- `lib/integrity-scan.ts` — existing integrity/duplicate/editorial checks.
- `lib/catalog-audits.ts` — sensory/cellar/expert-note audits.
- `lib/tech-facts/*` — technical evidence, identity matching, reconciliation and qualification.
- `lib/intelligence/*` — multi-source claims, source discovery, variety knowledge and AI guards.
- `lib/public-price.ts` / `lib/retailer-links.ts` — Profitshare-only public pricing.
- `lib/integrity-scan` admin data-quality UI and `lib/admin-auth`.

The new engine adds product-level factual scoring, explicit gates, source-gap plans,
the benchmark evaluator and the catalog-quality dashboard. It does not replace
the existing scanner or the V2 claim pipeline.

## Modules

| Module | Responsibility |
|---|---|
| `lib/quality/types.ts` | categories, gates, assessments and report schemas |
| `lib/quality/from-db.ts` | read-only adapter for current or legacy catalog schemas |
| `lib/quality/engine.ts` | factual completeness, commercial separation, gates and repair queue |
| `lib/quality/source-gaps.ts` | information-gain plans and unsuccessful-source cooldown cache |
| `lib/quality/source-discovery.ts` | reuses V2 discovery to match missing fields to sources |
| `lib/quality/benchmark.ts` | fixture baseline and frozen independent-model baseline; length is not rewarded |
| `lib/quality/release-gate.ts` | exact identity, source facts, completeness, Profitshare, RO/EN and SEO gate |
| `scripts/catalog-quality-audit.ts` | 50-wine and production-wide read-only reports |
| `scripts/quality-release-gate.ts` | automated release gate |
| `scripts/quality-benchmark.ts` | reusable benchmark report |
| `app/admin/catalog-quality/page.tsx` | admin dashboard with filters and repair queue |

## Factual completeness vs commercial availability

The nine factual categories are:

1. Identity/classification
2. Technical specifications
3. Sensory information
4. Serving information
5. Food pairings
6. Producer information
7. Grape/regional context
8. Evidence/provenance
9. Commercial availability — **reported separately**

`commercial` never changes the factual score or quality status. A wine with no
qualifying Profitshare offer is `unavailable`, not a low-quality record. A stored
`priceAvg` is internal research; only a retained `currentPrice` creates a
`NON_PROFITSHARE_PRICE_EXPOSURE` gate, and the public resolver must still return
`Price unavailable`.

### Structured completeness rule

A field is complete only when it exists as a structured, source-backed claim in
`wine_claim_evidence` (or a genuinely structured stored field such as alcohol or
bottle volume). Keywords in a free-text description—`Culoare`, `Miros`,
`Gust`, `Temperatura`—do **not** count as structured sensory or serving coverage.

This deliberately lowered the first measured scores:

- 50-wine sample: 0 complete / 29 partial / 21 incomplete; factual average 50.7%;
  sensory evidence coverage 0% because migration 0028 claims are not applied.
- Production: 0 complete / 116 partial / 149 incomplete; factual average 49%;
  sensory evidence coverage 0% for the same reason.

The previous keyword-based view overstated sensory completeness. The repair
queue now correctly prioritizes the missing structured claims/backfill.

## Gates

- incorrect variant (name grape not in stored varieties)
- Demisec/Demidulce mixing
- different bottle sizes merged (duplicate/merge review)
- vintage mismatch
- contradictory alcohol values
- duplicate wines
- wrong bottle photo (colour/vintage/sweetness cue)
- unattributed tasting claims
- generic AI prose presented as bottle facts
- serving temperature present in source but not structured
- incomplete public rendering
- non-qualifying public price exposure

Each gate has severity, blocking status and repair action. No destructive merge is
performed.

## Source-gap discovery

Missing fields are mapped to preferred source classes and ranked by information
gain. `SourceAttemptCache` prevents repeated queries: blocked sources are never
retried; temporary failures use exponential cooldown. `discoverSourcesForGaps`
reuses V2 source discovery and only proposes sources that cover the missing fields.

## Benchmark

The evaluation set contains the ten practical questions requested. Scoring:

- factual correctness 40
- evidence quality 20 (cited source-backed claims)
- usefulness 20
- completeness 20
- unsupported assertions −15 each
- **length adds no score**

The reported fixture baseline is a hand-authored synthetic negative control, not
ChatGPT. The independent baseline is a frozen answer set generated separately
from label facts and stored under `benchmarks/`; the scorer makes no model call.

See [`catalog-quality-benchmark.md`](./catalog-quality-benchmark.md) and
[`benchmarks/README.md`](../benchmarks/README.md).

## Admin dashboard

`/admin/catalog-quality` shows totals, complete/incomplete, technical and sensory
coverage, identity conflicts, duplicates, missing producer sources, affiliate
price coverage, recently improved records, critical gates and the retry queue.
Filters: search, status and gate.

## Release gate

`npx tsx scripts/quality-release-gate.ts` checks:

- exact Murfatlar target variant key;
- every V2 claim has a source, excerpt and non-conflicting identity;
- public completeness ≥90%;
- no price claim and no JSON-LD offers without a qualified Profitshare offer;
- RO/EN `Price unavailable` labels;
- SEO structured data has no leaked price;
- catalog-wide: every representative wine without a qualified offer has
  `publicPrice = null`;
- catalog-wide: no representative wine has an exact-product identity conflict.

The current production read-only run checks all 265 catalog rows and reports
265/265 safe for non-qualified public price exposure and 0 identity conflicts.

Current target result: **PASS** on all six checks.

## Commands

```bash
# 50-wine read-only sample
npx tsx scripts/catalog-quality-audit.ts --sample=50 \
  --out=docs/catalog-quality-sample-50.md \
  --json=docs/catalog-quality-sample-50.json

# Production-wide read-only audit
npx tsx scripts/catalog-quality-audit.ts --all \
  --out=docs/catalog-quality-production.md \
  --json=docs/catalog-quality-production.json

# Benchmark
npx tsx scripts/quality-benchmark.ts

# Release gate
npx tsx scripts/quality-release-gate.ts

# Admin
# open /admin/catalog-quality (requires admin auth)
```

No command above writes catalog data. No migration is introduced by this engine;
it reads the existing schema and handles legacy column sets defensively.

## Performance and AI cost

- 50-wine sample: **11 ms** in-process assessment.
- 265-wine production catalog: **20 ms**.
- Quality engine AI calls: **0**.
- If V2 AI interpretation is enabled later: target estimate 1 request, ~402 input
  + 420 output tokens, $0.000174; 50 wines ≈ **$0.009**, 265 wines ≈ **$0.046**.
  These are estimates, not calls made by this dry-run.
- Fixture source requests: 0.
