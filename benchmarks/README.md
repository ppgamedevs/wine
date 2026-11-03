# Benchmark answer sets

`scripts/quality-benchmark.ts` compares VinIntel's deterministic V2 answers with:

1. a hand-authored **fixture baseline** — deliberately weak synthetic control, not
   a model and not a ChatGPT comparison;
2. a frozen **independent model baseline** in
   `benchmarks/independent-answers.json`, generated from public label facts only.

The scorer does not call a model. It reads the frozen JSON, applies the same ten
questions and rubric to each set, and writes
`docs/catalog-quality-benchmark.{md,json}`.

## Independent answers

- Model: `grok-4.20-0309-non-reasoning` (provenance is stored in the JSON).
- One independent request was made through the xAI API; the raw answer was
  frozen in this directory.
- The model received only the public label facts: producer, region, wine type,
  sweetness, grape and the fact that vintage was not stated.
- It did not receive VinIntel claims or source URLs.
- `supportedFields`, `citations` and `unsupportedAssertions` are a frozen manual
  review of the generated answer. They are not model self-ratings.

Regeneration is optional and requires `XAI_API_KEY`:

```bash
npx tsx scripts/generate-independent-benchmark-answers.ts
```

The regeneration script preserves the previous annotations and asks for a
review if the text changes; do not commit regenerated text without re-reviewing
the annotations.

## Limits

The independent answer has no source citations, so its evidence score is low.
The fixture baseline is intentionally weak. Results are a methodology test, not
a claim about ChatGPT or a general model ranking.
