# PSEO question flywheel

## Goal

Turn repeated, high-value sommelier questions into grounded PSEO drafts without
letting thin or duplicated pages reach Google. The flywheel records demand,
clusters paraphrases, evaluates catalog coverage and creates noindex drafts for
human review.

## Architecture

```
Sommelier chat
  -> recordSommelierQuestion()
  -> sommelier_question_intents
  -> deterministic clustering
  -> quality gates
  -> buildGroundedDraft()
  -> pseo_draft_pages (status=draft, noindexUntilApproved=true)
  -> /admin/pseo-drafts review
```

The comparison engine from `lib/sommelier-comparison.ts` supplies the grounded
matches. PSEO text is assembled from catalog facts, comparison reasons and
differences. It is not a free-form model paraphrase.

## Schema

Migration: `drizzle/0029_pseo_question_flywheel.sql`

### `sommelier_question_intents`

- `raw_query`
- `normalized_query`
- `entities_json` with references, grapes, regions, wineries, wines, vintages
- `topic_cluster`
- `canonical_question`
- `intent_type`
- `language`
- `answer_quality` (`high`, `low`, `unknown`)
- `similar_page_exists`
- `blocked`, `block_reason`
- `source`, `metadata_json`, `created_at`

### `pseo_draft_pages`

- `slug`, `locale`, `page_type`
- title, meta, intro, markdown and structured sections/FAQ/sources
- `generated_from_intent_cluster`
- `cluster_key`
- `confidence`
- `publish_recommendation` (`publish`, `review`, `reject`)
- `noindex_until_approved` default `true`
- `status` (`draft`, `approved`, `published`, `rejected`)
- `supporting_wine_count`
- `demand_count`
- `quality_gate_json`
- `source_intent_ids_json`
- review notes and approval metadata

No public page is created by this migration. Drafts are visible only in the
admin report.

## Clustering and canonicalization

`analyzeQuestion()` normalizes diacritics, punctuation and wording. Related
references can share a canonical cluster parent: Chianti and Sangiovese both map
to `romanian_equivalent:chianti`, while the original reference names remain in
the logged entities.

Page identity uses:

- page type: equivalent, alternative, or wines for lovers;
- canonical reference id;
- locale-specific slug.

This makes "Romanian wine similar to Chianti", "closest Romanian equivalent to
Chianti" and "what Romanian wine if I like Sangiovese" consolidate into one
page when demand justifies it. A unique `(slug, locale)` constraint prevents
duplicate drafts.

## Quality gates

A draft is eligible only when every gate passes:

| Gate | Minimum |
|---|---|
| Repeated demand | 3 unique normalized questions |
| Answer quality | 2 high-quality, recommendation-bearing answers |
| Catalog support | 3 wines |
| Evidence coverage | 60% of structured dimensions |
| Duplication risk | at most 0.35 |
| Match confidence | 65% |

A passed cluster recommends `publish` when confidence is at least 80% and
duplication risk is at most 0.15; otherwise it recommends `review`. A failed
cluster is `reject` and no draft is generated.

Low-value filters block:

- unsupported or missing style references;
- nonsense and absurd food intents;
- questions shorter than 8 normalized characters.

## Example generated draft

A high-demand Chianti cluster with 4 supporting wines produces a draft like:

```json
{
  "slug": "vin-romanesc-asemanator-chianti",
  "locale": "ro",
  "pageType": "romanian_equivalent",
  "title": "Vin romanesc asemanator cu Chianti",
  "generatedFromIntentCluster": "romanian_equivalent:chianti",
  "status": "draft",
  "noindexUntilApproved": true,
  "publishRecommendation": "publish",
  "supportingWineCount": 4,
  "confidence": 0.84
}
```

The body explains that Chianti is a Tuscan reference, names the best Romanian
match, lists alternatives, separates similarities from differences, and
includes the evidence gaps. It does not claim the Romanian wine is identical to
Chianti.

## Admin review

`/admin/pseo-drafts` is protected by `requireAdmin()` and shows:

- total logged intents and blocked intents;
- cluster demand, supporting wines, coverage and confidence;
- every quality gate decision;
- draft status, recommendation, noindex state and grounded preview;
- approve/reject actions with a review note.

Approval changes review metadata only. There is no public indexable route for
these drafts in this change.

## Guardrails

- Drafts start as `draft` and `noindexUntilApproved=true`.
- No automatic publishing or sitemap submission.
- No LLM-generated page body.
- No invented awards, vintages, winery facts or tasting notes.
- Missing evidence is written as missing, not filled.
- One canonical draft per slug and locale.
- A similar existing page raises duplication risk instead of producing another
  page.

## Verification

- `lib/pseo-flywheel.test.ts`: clustering, nonsense blocking, gates, example
  draft, noindex default, locale slugs.
- `lib/pseo-flywheel-migration.test.ts`: additive table/index checks and journal
  entry.
- Full TypeScript, lint, test, build and security audit.
