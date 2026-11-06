# Babanu 2L import

Source: [Murfatlar Babanu](https://murfatlar-vinul.ro/babanu/)

Five source-backed 2L variants were added from the producer page and product
images:

| Variant | Type | Sweetness | Source identity |
|---|---|---|---|
| Babanu Roșu Demidulce, 2L | red | demidulce | `rosu-demidulce-2000ml` |
| Babanu Roșu Demisec, 2L | red | demisec | `rosu-demisec-2000ml` |
| Babanu Alb Demidulce, 2L | white | demidulce | `alb-demidulce-2000ml` |
| Babanu Alb Demisec, 2L | white | demisec | `alb-demisec-2000ml` |
| Babanu Roze Demidulce, 2L | rose | demidulce | `roze-demidulce-2000ml` |

## Import

```bash
npx tsx scripts/add-murfatlar-babanu-2000ml.ts
npx tsx scripts/add-murfatlar-babanu-2000ml.ts --apply
```

The script is dry-run by default. It uses `buildWineSlug` and exact source
identity, refuses existing slugs/source URLs, stores `user_submitted`, and keeps
`affiliateLinks: []` because no qualified Profitshare offer exists.

## Evidence boundaries

- Grape varieties, vintage and awards are not inferred.
- Alcohol is not stored from the bottle label.
- The 2L format comes from the producer page and bottle images.
- The rosé food pairings are the producer's explicit recommendations.
- The red and white pages only say "all types of dishes"; no dish-specific
  pairing is invented.
- Structured claims are skipped while `wine_claim_evidence` is absent
  (migration 0028 is not applied).

The five images are local WebP copies under
`public/images/wines/murfatlar-babanu-*-2000ml.webp`.
