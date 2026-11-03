# ChatGPT vs VinIntel benchmark — target wine

Generated: 2026-11-03T13:37:29.205Z

## Result

- VinIntel: **92/100**
- ChatGPT-style baseline: **2/100**
- Winner: **vinintel**

Length is not rewarded. Unsupported assertions lose points.

## Per-question scores

| Question | VinIntel | ChatGPT |
|---|---:|---:|
| style | 94 | 0 |
| grape | 94 | 20 |
| taste | 94 | 0 |
| temperature | 94 | 0 |
| food | 94 | 0 |
| origin | 94 | 0 |
| variety | 94 | 0 |
| compare | 74 | 0 |
| confirmed | 94 | 0 |
| offer | 94 | 0 |

## Notes

- Answer length does not add score.
- Unsupported assertions lose 15 points each.
- Evidence quality rewards cited, source-backed claims.

## Commands

```bash
npx tsx scripts/quality-benchmark.ts
```

No AI API was called; the VinIntel answer is built from source-backed V2 claims.