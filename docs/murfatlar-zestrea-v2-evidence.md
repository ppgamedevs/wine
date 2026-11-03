# Murfatlar Zestrea Muscat Ottonel Demisec 0.75L — V2 evidence report

Target: `wine_id 418`, `Zestrea Muscat Ottonel Demisec`.

Sources available for this run:

- Official producer page: <https://murfatlar-vinul.ro/zestrea/>
- Retailer factual source: <https://www.auchan.ro/vin-alb-demisec-murfatlar-zestrea-muscat-ottonel-0-75-l-sgr/p>
- Existing VinIntel record (wine 418)

Official technical sheets/PDFs, a producer catalogue, specialist pages,
education pages and independent editorial pages were **not available** for this
specific product in this run. They are not fabricated or replaced with arbitrary
links.

Full machine-readable sample: [`sample-evidence-murfatlar-zestrea.json`](./sample-evidence-murfatlar-zestrea.json).

## Recovered evidence

36 independent claims were extracted:

- 17 official producer-page claims
- 8 retailer claims
- 11 existing-record claims

| Field | Recovered value | Verification | Source |
|---|---|---|---|
| producer | Murfatlar | verified_official | producer page |
| range | Zestrea | verified_official | producer page |
| product_name | Muscat Ottonel | verified_official | producer page |
| grape_varieties | Muscat Ottonel | verified_official | producer page |
| bottle_volume | 750 ml | verified_official | producer page |
| wine_color | alb | verified_official | producer page |
| sweetness | demisec | verified_official | producer page |
| alcohol | **12.5%** | **attributed_retailer** | Auchan specification |
| appellation | DOC - CMD Murfatlar | verified_official | producer page |
| region | Murfatlar | verified_official | producer page |
| country | Romania | verified_official | producer page |
| serving_temperature | 7–8°C | verified_official | producer page |
| visual_appearance | galben-verzui | verified_official | producer page |
| aroma_descriptors | caracteristic soiului, plăcut, îmbietor | verified_official | producer page |
| taste_descriptors | echilibrat, aciditate medie, fructe verzi, final remanent | conflict (official value selected) | producer page vs existing record |
| acidity_perception | medie | verified_official | producer page |
| finish | remanent savuros | verified_official | producer page |
| food_pairing | aperitiv, pește, carne albă, vegetariene, brânzeturi, antreuri | verified_official | producer page |

The official producer block is the Demisec block only. The adjacent Demidulce
text (`galben pai cu reflexe aurii`, `soc și pere coapte`) is not assigned to
this bottle.

## Official vs retailer

- The producer page supports type, sweetness, grape, volume, DOC, region,
  serving temperature and sensory descriptions.
- The producer page does **not** state alcohol.
- Auchan reports `12,5% vol.` as a retailer specification. It is retained as
  retailer-attributed evidence and never marked producer-confirmed.
- No retailer sensory claim was used; there was no need to invent one.

## Conflicts and unresolved items

Preserved conflict:

- `taste_descriptors`: existing VinIntel record has a coarser descriptor list
  than the official producer block. The official producer value is selected for
  display, the conflict remains in `conflict_json`, and the field is marked
  `conflict` / unverified rather than silently overwritten.

Unresolved / unavailable:

- Official alcohol percentage: not published on the producer page.
- Official technical sheet/PDF: unavailable in this run.
- Vintage: not stated by either available source.
- Grape percentages, winemaking method, oak treatment, awards, cellaring and
  allergens: no explicit source evidence, so no value is invented.
- Specialist/education/editorial product sources: unavailable.

## Before / after completeness

Required fields: 15 core/sensory fields.

| State | Present required | Completeness | Missing required |
|---|---:|---:|---|
| Before (existing record) | 11/15 | 73% | alcohol, appellation, region, country |
| After (reconciled V2) | 15/15 | **100%** | none |

Additional fields added: `alcohol` (retailer-attributed), `appellation`, `region`,
`country`, `acidity_perception`, `finish`, `food_pairing`.
`taste_descriptors` changed from the existing coarse list to the official
bounded list, but the disagreement is preserved.

Completeness by group after reconciliation:

- core: 12/13
- sensory: 5/7
- production: 0/3
- commercial: 1/5

The missing production/commercial fields are genuinely unavailable, not
silently filled.

## Cost and request report

- Source network requests in fixture mode: **0**
- AI interpretation requests (estimate): **1**
- Input tokens: **~402**
- Output tokens: **420**
- Estimated AI cost: **$0.000174**
- AI was **not called** in dry-run; the report contains the estimate only.

## Pricing firewall

No retailer price was extracted or promoted. The Auchan source is factual
research only. Public prices remain exclusively controlled by the qualifying
Profitshare resolver from Prompt 1.

## Commands

```bash
# Dry run (default; no DB mutation)
npx tsx scripts/wine-intelligence-v2.ts --wine=418

# Write this report's JSON
npx tsx scripts/wine-intelligence-v2.ts --wine=418 \
  --out=docs/sample-evidence-murfatlar-zestrea.json

# Controlled apply only after migration 0028 review
npx tsx scripts/wine-intelligence-v2.ts --wine=418 --apply
```
