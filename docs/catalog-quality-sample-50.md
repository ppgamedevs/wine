# Wine Catalog Quality Engine — 50-wine sample audit

Generated: 2026-11-03T17:32:37.857Z

## Summary

- Total wines: 50
- Complete: 0
- Partial: 29
- Incomplete: 21
- Factual completeness average: 50.7%
- Verified technical coverage: 66%
- Sensory evidence coverage: 0%
- Identity conflicts: 0
- Potential duplicate groups: 0
- Missing producer sources: 0
- Qualifying affiliate price coverage: 0
- No affiliate price (separate from quality): 50
- Critical gates: 29
- Retry queue: 38
- Recently improved: 15

## Gate counts

| Gate | Count |
|---|---:|
| NON_PROFITSHARE_PRICE_EXPOSURE | 29 |
| INCOMPLETE_PUBLIC_RENDERING | 14 |
| GENERIC_AI_FACT | 2 |

## Structured field coverage (no keyword inference, no data mutation)

| Field | Structured present | Total |
|---|---:|---:|
| tasting_notes | 0 | 50 |
| serving_temperature | 0 | 50 |
| food_pairing | 4 | 50 |
| alcohol | 33 | 50 |
| source_url | 50 | 50 |

This dry-run does not treat a keyword in free text as structured evidence.
The before/after backfill projection is intentionally not claimed until
migration 0028 and source-backed claims are applied.

## Representative coverage

- Types: white 26, red 8, rose 13, sparkling 2
- Vintage present / non-vintage: 31 / 19
- Stored price present: 29
- Multiple stored links: 1
- Target wine included: yes

## Sample records

| ID | Wine | Status | Factual | Gates |
|---:|---|---|---:|---|
| 418 | Zestrea Muscat Ottonel Demisec, Murfatlar, 0.75L | incomplete | 45% | INCOMPLETE_PUBLIC_RENDERING |
| 387 | Sable Noble Roșu | incomplete | 45% | — |
| 388 | Sable Noble Roze | incomplete | 45% | — |
| 389 | Sable Noble Alb | incomplete | 45% | — |
| 396 | Statornic Sauvignon Blanc, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 397 | Statornic Cabernet Sauvignon Roze, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 398 | Statornic Pinot Noir, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 399 | Statornic Merlot, Murfatlar, 0.75L | incomplete | 45% | — |
| 400 | Statornic Riesling Italian, Murfatlar, 0.75L | incomplete | 45% | GENERIC_AI_FACT, INCOMPLETE_PUBLIC_RENDERING |
| 409 | Zestrea Cabernet Sauvignon, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 410 | Zestrea Pinot Noir, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 411 | Zestrea Merlot & Cabernet Sauvignon Roze Demidulce, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 412 | Zestrea Muscat Ottonel Demidulce, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 413 | Zestrea Sauvignon Blanc, Murfatlar, 0.75L | incomplete | 48% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 414 | Zestrea Fetească Neagră, Murfatlar, 0.75L | incomplete | 45% | INCOMPLETE_PUBLIC_RENDERING |
| 415 | Zestrea Merlot & Cabernet Sauvignon Roze Demisec, Murfatlar, 0.75L | incomplete | 45% | INCOMPLETE_PUBLIC_RENDERING |
| 416 | Zestrea Chardonnay, Murfatlar, 0.75L | incomplete | 45% | INCOMPLETE_PUBLIC_RENDERING |
| 417 | Zestrea Riesling Italian, Murfatlar, 0.75L | incomplete | 45% | INCOMPLETE_PUBLIC_RENDERING |
| 150 | Solo Quinta Alb | incomplete | 46% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 187 | La Stejari Merlot | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 149 | Solo Quinta Roze | partial | 58% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 151 | Muse Stars Rosè (Spumant) | partial | 54% | GENERIC_AI_FACT |
| 153 | Muse Night | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 159 | Schwaben Wein Roze | partial | 50% | — |
| 161 | Conacul Ambrozy Sauvignon Blanc | partial | 50% | — |
| 162 | Muse Stars Brut (Spumant) | partial | 50% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 199 | EXPLICIT Rară Neagră & Merlot | partial | 58% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 152 | Muse Day | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 154 | Sole Roze | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 155 | IMPLICIT Roze | partial | 54% | — |
| 156 | EXPLICIT Roze | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 157 | Castel Huniade Roze | incomplete | 46% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 158 | Schwaben Wein Roze Demisec | incomplete | 46% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 160 | La Stejari Chardonnay | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 163 | Muse White | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 164 | Muse White Magnum | partial | 54% | — |
| 165 | Sole Chardonnay | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 166 | Sole Fetească Regală | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 167 | Sole Orange Wine | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 168 | Sole Viognier | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 169 | Sole Sauvignon Blanc | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 170 | IMPLICIT Aligoté | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 171 | IMPLICIT Chardonnay | partial | 54% | — |
| 172 | IMPLICIT Pinot Grigio | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 173 | IMPLICIT Sauvignon Blanc | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 174 | EXPLICIT Sauvignon Blanc | partial | 54% | — |
| 175 | EXPLICIT Chardonnay | partial | 54% | — |
| 177 | EXPLICIT Fetească Regală | partial | 54% | — |
| 178 | EXPLICIT Muscat ottonel | partial | 54% | — |
| 179 | Castel Huniade Riesling | partial | 54% | — |

## Prioritized repair queue

| Priority | Wine | Action |
|---|---|---|
| P0 | murfatlar-alb-demisec-statornic-sauvignon-blanc-murfatlar-vinul-0-75l | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | murfatlar-statornic-roze | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | murfatlar-rosu-sec-statornic-pinot-noir-0-75l-doc-cmd-murfatlar | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | murfatlar-zestrea-cabernet-sauvignon-0-75l | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | murfatlar-zestrea-pinot-noir-0-75l | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | murfatlar-zestrea-merlot-cabernet-sauvignon-roze-demidulce-0-75l | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | murfatlar-zestrea-muscat-ottonel-demidulce-0-75l | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | murfatlar-zestrea-sauvignon-blanc-0-75l | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-solo-quinta-alb-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-la-stejari-merlot-2020 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-solo-quinta-roze-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-muse-night-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-muse-stars-brut | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-explicit-rara-neagra-merlot-2024 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-muse-day-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-sole-roze-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-explicit-roze-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-castel-huniade-roze-2023 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-schwaben-wein-roze-demisec-2023 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-la-stejari-chardonnay-2020 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |

No database writes were performed.