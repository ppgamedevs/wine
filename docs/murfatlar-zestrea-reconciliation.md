# Murfatlar Zestrea reconciliation (read-only)

Generated: 2026-11-03T11:56:57.421Z

## Summary

- Producer variants parsed from the live-page fixture: 10
- Unique canonical keys: 10
- Existing DB rows with Zestrea in the name: 10
- Rows matching exactly one producer variant: 10
- Rows with no exact match: 0
- Rows with ambiguous matches: 0

## Canonical producer variants

| key | name | sweetness | grapes | volume | source product id |
|---|---|---|---|---:|---|
| `zestrea-cabernet-sauvignon-rosu-demisec-750ml` | Zestrea Cabernet Sauvignon | demisec | Cabernet Sauvignon | 750 | `zestrea-cabernet-sauvignon-rosu-demisec-750ml` |
| `zestrea-feteasca-neagra-rosu-demidulce-750ml` | Zestrea Fetească Neagră | demidulce | Fetească Neagră | 750 | `zestrea-feteasca-neagra-rosu-demidulce-750ml` |
| `zestrea-pinot-noir-rosu-demidulce-750ml` | Zestrea Pinot Noir | demidulce | Pinot Noir | 750 | `zestrea-pinot-noir-rosu-demidulce-750ml` |
| `zestrea-merlot-cabernet-sauvignon-roze-demidulce-750ml` | Zestrea Merlot & Cabernet Sauvignon Roze Demidulce | demidulce | Merlot + Cabernet Sauvignon | 750 | `zestrea-merlot-cabernet-sauvignon-roze-demidulce-750ml` |
| `zestrea-merlot-cabernet-sauvignon-roze-demisec-750ml` | Zestrea Merlot & Cabernet Sauvignon Roze Demisec | demisec | Merlot + Cabernet Sauvignon | 750 | `zestrea-merlot-cabernet-sauvignon-roze-demisec-750ml` |
| `zestrea-chardonnay-alb-demidulce-750ml` | Zestrea Chardonnay | demidulce | Chardonnay | 750 | `zestrea-chardonnay-alb-demidulce-750ml` |
| `zestrea-muscat-ottonel-alb-demidulce-750ml` | Zestrea Muscat Ottonel Demidulce | demidulce | Muscat Ottonel | 750 | `zestrea-muscat-ottonel-alb-demidulce-750ml` |
| `zestrea-riesling-italian-alb-demisec-750ml` | Zestrea Riesling Italian | demisec | Riesling Italian | 750 | `zestrea-riesling-italian-alb-demisec-750ml` |
| `zestrea-sauvignon-blanc-alb-demisec-750ml` | Zestrea Sauvignon Blanc | demisec | Sauvignon Blanc | 750 | `zestrea-sauvignon-blanc-alb-demisec-750ml` |
| `zestrea-muscat-ottonel-alb-demisec-750ml` | Zestrea Muscat Ottonel Demisec | demisec | Muscat Ottonel | 750 | `zestrea-muscat-ottonel-alb-demisec-750ml` |

## Existing rows

| id | slug | identity match | conflicts | action |
|---:|---|---|---|---|
| 409 | `murfatlar-zestrea-cabernet-sauvignon-0-75l` | `zestrea-cabernet-sauvignon-rosu-demisec-750ml` | — | preserve id/slug; add canonical source after review |
| 410 | `murfatlar-zestrea-pinot-noir-0-75l` | `zestrea-pinot-noir-rosu-demidulce-750ml` | — | preserve id/slug; add canonical source after review |
| 411 | `murfatlar-zestrea-merlot-cabernet-sauvignon-roze-demidulce-0-75l` | `zestrea-merlot-cabernet-sauvignon-roze-demidulce-750ml` | — | preserve id/slug; add canonical source after review |
| 412 | `murfatlar-zestrea-muscat-ottonel-demidulce-0-75l` | `zestrea-muscat-ottonel-alb-demidulce-750ml` | — | preserve id/slug; add canonical source after review |
| 413 | `murfatlar-zestrea-sauvignon-blanc-0-75l` | `zestrea-sauvignon-blanc-alb-demisec-750ml` | — | preserve id/slug; add canonical source after review |
| 414 | `murfatlar-zestrea-feteasca-neagra-0-75l` | `zestrea-feteasca-neagra-rosu-demidulce-750ml` | — | preserve id/slug; add canonical source after review |
| 415 | `murfatlar-zestrea-merlot-cabernet-sauvignon-roze-demisec-0-75l` | `zestrea-merlot-cabernet-sauvignon-roze-demisec-750ml` | — | preserve id/slug; add canonical source after review |
| 416 | `murfatlar-zestrea-chardonnay-0-75l` | `zestrea-chardonnay-alb-demidulce-750ml` | — | preserve id/slug; add canonical source after review |
| 417 | `murfatlar-zestrea-riesling-italian-0-75l` | `zestrea-riesling-italian-alb-demisec-750ml` | — | preserve id/slug; add canonical source after review |
| 418 | `murfatlar-zestrea-muscat-ottonel-demisec-0-75l` | `zestrea-muscat-ottonel-alb-demisec-750ml` | — | preserve id/slug; add canonical source after review |

## Target before/after completeness

| field | before (DB) | after (producer identity) |
|---|---|---|
| type | white | alb |
| sweetness | demisec | demisec |
| grape | Muscat Ottonel | Muscat Ottonel |
| volume | 750 | 750 |
| DOC | missing | DOC - CMD Murfatlar |
| visual description | present | present |
| aroma description | present | present |
| taste description | present | present |
| serving temperature | present | 7–8°C |
| alcohol | missing (not present in old schema) | 12.5% retailer-reported only (not producer-confirmed) |
| source product id | missing in old schema | `zestrea-muscat-ottonel-alb-demisec-750ml` |

## Target official producer description (Demisec block only)

> Culoare: galben-verzui. Miros: caracteristic soiului, plăcut, îmbietor.
> Gust: echilibrat, o aciditate medie cu caracteristică de fructe verzi.
> Octuozitate delicată, cu gust final remanent savuros. Temperatura de
> servire: 7-8°C. Asocierea culinară: se poate servi ca aperitiv sau alături
> de preparate din pește, carne albă, preparate vegetariene, brânzeturi,
> diverse antreuri.

This text is materially different from the adjacent Demidulce block
(`galben pai cu reflexe aurii`, `soc și pere coapte`). The regression test
asserts that the Demidulce aroma cannot appear on the Demisec record.

## Independent retailer source and alcohol provenance

- Source: [Auchan — Vin alb demisec Murfatlar Zestrea, Muscat Ottonel, 0.75 l](https://www.auchan.ro/vin-alb-demisec-murfatlar-zestrea-muscat-ottonel-0-75-l-sgr/p)
- Product title: `Vin alb demisec Murfatlar Zestrea, Muscat Ottonel, 0.75 l`
- Alcohol: `12,5% vol.` — retailer specification
- Provenance: `retailer_specification`; `producerConfirmedAlcohol: false`
- The producer page does not state alcohol, so producer canonical facts keep
  `alcohol: null`. The retailer value is evidence, not a producer-confirmed
  fact, and must not overwrite a future official value.

## Actions and safety

- Preserve every existing id and slug (409–418).
- Do not merge or delete any row.
- Add canonical `sourceProductId`/source URL only after review; the old schema
  in this database has no `source_url` column, so the report cannot claim
  existing source provenance.
- Re-running ingestion is idempotent: exact source URL first, then canonical
  identity; ambiguous matches return `review_ambiguous` and are not written.
- No rows were modified, merged or deleted by this audit.
