# Prioritized catalog repair queue

Generated from the read-only production audit (`docs/catalog-quality-production.json`).

## P0 — policy and identity blockers

**180 wines** expose a retained `currentPrice` without a fresh, fully qualified
Profitshare offer. The public resolver must continue to return
`Price unavailable`; these records need offer reconciliation or removal of the
legacy public price field. This is a commercial/provenance gate, not a factual
quality judgement about the wine.

No exact-product identity conflicts and no duplicate groups remain after the
channel-aware duplicate check. Regression tests still cover both gates.

## P1 — evidence / rendering

| Issue | Wines | Action |
|---|---:|---|
| `INCOMPLETE_PUBLIC_RENDERING` | 24 | Structure existing source text (food pairing, attribution) into public fields; do not add unsourced content. |
| `WRONG_BOTTLE_PHOTO` | 2 | Replace with exact-product image or remove the image. |
| `GENERIC_AI_FACT` | 10 | Keep generic interpretation separate from bottle facts. |

## P2 — factual coverage

- 157 partial records: mostly missing alcohol, sugar/acidity, structured food
  pairing or serving information.
- 265 wines have no qualifying affiliate price. This is **not** a factual defect
  and must not lower record quality.
- 265 wines have an official/source URL in the current read-only schema, but 24
  still need public rendering work.
- 25 records were improved in the last 30 days.

## Suggested order

1. Repair the 180 retained current prices to the Profitshare-only model.
2. Resolve the two bottle-photo mismatches and review generic sensory prose.
3. Structure food/serving fields already present in source excerpts (24 records).
4. Fill technical gaps via official technical sheets/PDFs, ranked by information
   gain; never repeat a blocked/failed source without cooldown.
5. Re-run the release gate and the 50-wine sample before any production write.
