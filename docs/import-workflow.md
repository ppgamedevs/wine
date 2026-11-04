# Import-to-publication workflow

This workflow is represented by `lib/wine-import-workflow.ts`. It is deterministic
and side-effect free. The caller persists the returned steps into the existing
`wine_enrichment_runs` ledger or its own operational log.

| # | Step | Idempotency key | Retryable |
|---:|---|---|---|
| 1 | Import candidate | producer + variant + volume + vintage + source | yes |
| 2 | Validate exact product identity | base + identity | no, until data changes |
| 3 | Collect authorized sources | base + sources | yes |
| 4 | Extract structured technical/sensory evidence | base + evidence | yes |
| 5 | Reconcile source conflicts | base + conflicts | no, until resolved |
| 6 | Generate grounded editorial | base + editorial | yes |
| 7 | Compute price-independent quality indicators | base + quality | yes |
| 8 | Compute Value Score only with qualified price | base + value | yes |
| 9 | Evaluate catalog quality gates | base + gates | no |
| 10 | Publish or queue for manual review | base + publish | yes |

## Outcomes

- `publish`: identity, sources, evidence, editorial and catalog gates pass.
- `manual_review`: the candidate is structurally usable but lacks a verified
  status, a quality score, structured claims or grounded editorial.
- `blocked`: identity conflict, unresolved source conflict or critical catalog
  gate failure.

An administrator running an import script does **not** make a wine verified. The
default import status is `user_submitted`; publication requires the workflow and
human review.

## Value and quality

Steps 7 and 8 are deliberately separate:

- quality uses `qualityFinal`, `qualityEffective`, or a sufficiently evidenced
  `estimatedQuality`;
- value requires a fresh, exact-product Profitshare offer.

If value is unavailable, step 8 stays pending. It never blocks a quality score
and never invents a price.

## Premiat-specific audit

`lib/murfatlar-premiat-profile.ts` stores the three 750 ml variants, including
official source text and clean Romanian diacritics. `scripts/repair-murfatlar-premiat-750ml.ts`
is dry-run by default and requires both `--apply --confirm-repair` to write. It
uses `?variant=` identities rather than fake `#anchor` fragments.
