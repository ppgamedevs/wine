# Migration 0028 validation

Generated: 2026-11-03T19:19:27.102Z

## Result

- **true**
- Source: configured production database (read-only); sanitized allow-listed data subset
- Clone: tmp/migration-0028-clone.db (temporary, not committed)
- Actual migration path: `drizzle-orm/libsql/migrator` with the production journal
- CI-safe copy of the actual path: `lib/migrations/0028-migration.test.ts` against a schema-only fixture (no production data)

## Schema

- Copied sanitized data tables: `wineries` (25), `regions` (19), `grape_varieties` (18), `wines` (265), `wine_fact_evidence` (445)
- Redacted columns: `wineries`: stripe_customer_id, stripe_subscription_id, stripe_subscription_status; `regions`: none; `grape_varieties`: none; `wines`: submitted_email; `wine_fact_evidence`: none
- New 0028 tables: `grape_variety_knowledge`, `wine_ai_interpretations`, `wine_claim_evidence`, `wine_enrichment_runs`
- Pre-existing tables changed: 0
- Removed tables: 0

### Schema drift

Compared production clone against a fresh database built from migrations 0000–0027: 2 table(s), 6 column difference(s).

- `wineries`: production-only columns premium_expires_at, premium_plan; history-only columns none
- `winery_premium_checkouts`: production-only columns expires_at, welcome_email_sent_at, reminder_email_sent_at, expired_email_sent_at; history-only columns none

This is pre-existing migration-history drift, not drift introduced by 0028. The production clone is the schema source of truth; the test proves 0028 only creates the four new V2 tables/indexes.

## Existing data preservation

- Preserved: **true**
- Before counts: {"wineries":25,"regions":19,"grape_varieties":18,"wines":265,"wine_fact_evidence":445}
- After counts: {"wineries":25,"regions":19,"grape_varieties":18,"wines":265,"wine_fact_evidence":445}
- SHA-256 hashes of every copied row before/after:

```json
{
  "before": {
    "wineries": "b4229271e966a391aae7e4f48df2d2a2b19436028bc43a96a6283c4787ae9165",
    "regions": "a6ad625b407e0c747a39fd5b6a6e0ebbf9d3f7e124214c07b5c086df4ed454b2",
    "grape_varieties": "28be04cd54c1f48f2e3788016650906bb687499889b2dbdb3588d76d0cafd994",
    "wines": "c2282692f00fba8760838af530a17debf8e2f468440f0adfb59e80df0273f34f",
    "wine_fact_evidence": "5f2dd3f159be9b39c68b4493c92d182a2372488bf2d60b07a330816a6ce6dbab"
  },
  "after": {
    "wineries": "b4229271e966a391aae7e4f48df2d2a2b19436028bc43a96a6283c4787ae9165",
    "regions": "a6ad625b407e0c747a39fd5b6a6e0ebbf9d3f7e124214c07b5c086df4ed454b2",
    "grape_varieties": "28be04cd54c1f48f2e3788016650906bb687499889b2dbdb3588d76d0cafd994",
    "wines": "c2282692f00fba8760838af530a17debf8e2f468440f0adfb59e80df0273f34f",
    "wine_fact_evidence": "5f2dd3f159be9b39c68b4493c92d182a2372488bf2d60b07a330816a6ce6dbab"
  }
}
```

## Reproduction

```bash
npx tsx scripts/validate-migration-0028.ts
```

The script never writes to the configured source database.
