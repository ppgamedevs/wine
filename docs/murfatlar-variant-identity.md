# Murfatlar variant identity: root cause and fix

## Critical case

`Murfatlar Zestrea Muscat Ottonel Demisec 0.75L` shares `Zestrea Alb` with
Chardonnay, Riesling Italian and Muscat Ottonel Demidulce. The old parser could
produce several variants with the **same key and source URL**:

- `Zestrea Roșu` x3 -> `#rosu`
- `Zestrea Roze` x2 -> `#roze`
- `Zestrea Alb` x4 -> `#alb`

The bounded sensory block was usually parsed correctly, but the product key,
display name, image and matching path were not unique. A selector such as
`#alb` returned the first white product (Chardonnay), and a name lookup could
fall through to a same-colour variant. This is the identity contamination
class that could attach Demidulce aromas/identity to Demisec.

## Exact old failure points

| Location | Old behaviour | Consequence |
|---|---|---|
| `lib/murfatlar-producer.ts` `variantKeyForColor()` | key was only `alb` / `rosu` / `roze` | same-colour variants collided |
| `lib/murfatlar-producer.ts` `parseMurfatlarProductVariants()` | name/source fragment used colour only | duplicate names and duplicate source URLs |
| `lib/murfatlar-producer.ts` `matchMurfatlarVariant()` | exact name, then colour fallback | ambiguous colour silently selected the first variant |
| `lib/murfatlar-producer.ts` `matchMurfatlarVariantByHash()` | looked up a colour-only key | `#alb` was not an exact product selector |
| `scripts/import-murfatlar-catalog.ts` | deduped only by `findWineBySourceUrl()` | same-colour variants shared a source URL and were skipped/misidentified |
| `lib/analyze-wine-service.ts` `applySourceProducerFacts()` | only replaced `product.name`; the URL fragment is not sent to the server | downstream generic analysis could classify the whole range, not the variant |
| `lib/tech-facts/identity.ts` `classifyProductIdentity()` | no sweetness check; grapes were a wildcard when missing | Demisec could be considered the same as Demidulce |
| `lib/tech-facts/source-identity.ts` | source type/grapes/sweetness/volume were always empty | independent retailer evidence could not conflict-check |
| `lib/wine-duplicate-detection.ts` `findByIdentity()` | name/colour/blend/vintage only | sweetness, grape and volume conflicts were ignored |

## Fixed model

`lib/wine-identity.ts` defines `CanonicalWineIdentity`:

producer + range + specific product name + grape variety/blend + colour +
sweetness + bottle size + vintage (when known) + source product id.

`wineIdentityConflicts()` treats an explicit sweetness, grape, bottle-size or
vintage mismatch as a conflict. Missing data is unknown, not a wildcard.

`lib/murfatlar-producer.ts` now:

- finds each variant's own bounded product heading, sweetness, DOC and rich-text
  block; it never reads the previous variant's sensory block;
- creates a unique source product id, e.g.
  `zestrea-muscat-ottonel-alb-demisec-750ml`;
- uses that id for `variantKey`, `sourceProductId` and the URL fragment;
- matches by complete identity and fails closed when more than one variant
  remains, including a legacy `#alb` fragment;
- keeps Demidulce and Demisec notes separate (regression tests assert this).

`lib/murfatlar-ingest.ts` finds an existing record first by canonical source URL,
then by canonical identity (range, sweetness, colour, grape set, volume,
vintage). It preserves the existing id/slug, never merges, and returns
`review_ambiguous` / `review_slug_collision` for manual review.

## Review

See [`murfatlar-zestrea-reconciliation.md`](./murfatlar-zestrea-reconciliation.md)
for the read-only report. Existing Zestrea rows 409–418 match 10/10 producer
variants with no ambiguity. No production rows were modified.

The independent Auchan source for the target reports **12.5% alcohol** as a
retailer specification. It is recorded as retailer provenance only and is not
producer-confirmed. The producer page does not state alcohol, so
`parseMurfatlarProducerFacts()` keeps `alcohol: null`.
