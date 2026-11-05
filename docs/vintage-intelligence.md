# Vintage Intelligence V1

## Product identity and families

Each catalog row remains a distinct wine product. `lib/vintage/types.ts` derives a
canonical family key from producer, range, product name without vintage/packaging,
colour and sweetness. Different vintages can be compared as a family, while
`buildVintageFamily()` reports blend and bottle-format differences and never
merges technical facts, prices, notes, awards or reviews. Non-vintage products
use `vintage = null`.

The family key is computed at read time. The first migration is deliberately
additive and does **not** add a required column to `wines`, so the application can
build before the migration is applied.

## Evidence model

`drizzle/0030_vintage_intelligence.sql` adds `vintage_evidence` with scope:

- region + harvest year
- appellation + harvest year
- grape + region + harvest year
- winery + harvest year
- specific wine + harvest year

Every row records source URL/title, publisher, publication date, excerpt,
confidence, producer claim vs independent assessment, evidence type, impact,
regional-exception status and an optional growing-season event date. The national
weather average is never used as a regional substitute; matching requires the
wine's exact region/vintage and, where applicable, grape.

Evidence ingestion:

```bash
npx tsx scripts/vintage-evidence.ts --file=vintage-evidence.json
npx tsx scripts/vintage-evidence.ts --file=vintage-evidence.json --apply --confirm-apply
```

The apply path refuses Vercel/production environments. Dry-run is the default.
The source JSON is validated by `lib/vintage/ingest.ts`; missing provenance or
invalid confidence is rejected.

## Classification methodology

`lib/vintage/assessment.ts` uses only matching evidence scopes and chooses the
most specific scope with at least two items. No numeric 0–100 vintage quality
score is produced. The categories are:

- **exceptional** — multiple positive independent sources, an official report and
  harvest/ripeness evidence, with no major negative evidence
- **favorable** — at least two positive items and no major negative evidence
- **mixed** — favourable and negative/mixed evidence coexist
- **difficult** — at least two negative items and no positive evidence
- **insufficient** — fewer than two evidence items, insufficient independent
  sources, or missing harvest/ripeness context

Confidence is a source/evidence confidence indicator, not a wine score or bottle
rating. A regional harvest classification is never presented as a specific
bottle rating. Maturity is shown only from explicit `maturity_guidance`; otherwise
the UI says information is insufficient and never promises future quality.

## UI

- Wine pages: **Povestea recoltei {year}** with classification, summary, strengths,
  challenges, timeline, grape suitability, maturity, sources/confidence and the
  evidence/interpretation/unknown split.
- Multi-vintage family: **Compară recoltele** side-by-side cards; blend and bottle
  format differences are flagged.
- Discoverable guide: `/ghid-recolte` (RO) and `/en/vintage-guide` (EN), linked in
  the main navigation.

Screenshots (local demo database, sources explicitly labelled **Demo dataset —
methodology fixture**; no production evidence is claimed):

- [Desktop wine story](vintage-story-desktop.png)
- [Mobile wine story](vintage-story-mobile.png)
- [Vintage guide](vintage-guide-desktop.png)

## Production status

Migration 0030 has **not** been applied to production. The UI fails closed to
“insufficient evidence” when the table is absent. No production migration,
evidence ingestion, backfill, deployment or merge is part of this change.
