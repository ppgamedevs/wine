# VinIntel benchmark — fixture baseline and independent model baseline

Generated: 2026-11-03T19:15:01.100Z

> The fixture baseline is a synthetic negative control, not a model.
> The old synthetic comparison label has been removed; see the independent
> model baseline for a separately generated comparison.

## Method

- **VinIntel**: deterministic answers built only from the V2 `reconciled` claims and their source URLs.
- **Fixture baseline**: Fixture baseline — hand-authored synthetic negative control. This is a hand-authored negative control, not an AI model.
- **Independent baseline**: Independent Grok baseline, model `grok-4.20-0309-non-reasoning`, generated independently from the public label facts (no VinIntel claims). Frozen answers: `benchmarks/independent-answers.json`.
- Both baselines use the same ten questions and the same rubric. Every answer is scored per question; answer length adds nothing and unsupported assertions lose 15 points.

## Results

| Set | Score |
|---|---:|
| VinIntel | 78/100 |
| Fixture baseline (synthetic control) | 2/100 |
| Independent model baseline | 31/100 |

### Per question

| Question | VinIntel | Fixture baseline | Independent baseline |
|---|---:|---:|---:|
| style | 94 | 0 | 80 |
| grape | 94 | 20 | 80 |
| taste | 94 | 0 | 0 |
| temperature | 94 | 0 | 0 |
| food | 94 | 0 | 0 |
| origin | 94 | 0 | 60 |
| variety | 26 | 0 | 12 |
| compare | 74 | 0 | 0 |
| confirmed | 94 | 0 | 80 |
| offer | 26 | 0 | 0 |

## Interpretation

- The fixture baseline is deliberately weak and exists to test the rubric; do not use it as a model comparison.
- The independent model baseline received only public label facts and returned no source citations. Its evidence score is therefore low, while its label-level answers are scored separately.
- VinIntel's higher evidence score comes from cited V2 claims, not from answer length.
- The independent answers are frozen; a rerun produces the same score without an API call. The generation script is documented below for provenance.

## Reproduction

```bash
npx tsx scripts/quality-benchmark.ts
```

To regenerate frozen independent answers (requires `XAI_API_KEY`; not run in CI):

```bash
npx tsx scripts/generate-independent-benchmark-answers.ts
```

## Limitations

- Field annotations for the independent answers are a frozen manual review; they are recorded in the JSON file, not inferred by the scorer.
- No model API is called by the scorer; the independent answers are frozen and provenance-stamped.
- The V2 report used here is the audited target fixture, not production completeness evidence.
