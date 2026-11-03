# Wine Catalog Quality Engine — 50-wine sample audit

Generated: 2026-11-03T13:38:50.891Z

## Summary

- Total wines: 50
- Complete: 42
- Partial: 8
- Incomplete: 0
- Factual completeness average: 86.2%
- Verified technical coverage: 66%
- Sensory evidence coverage: 96%
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

## Deterministic dry-run field coverage (before → after structuring existing evidence)

| Field | Before | After | Total |
|---|---:|---:|---:|
| tasting_notes | 50 | 50 | 50 |
| serving_temperature | 13 | 13 | 50 |
| food_pairing | 18 | 18 | 50 |
| alcohol | 33 | 33 | 50 |
| source_url | 50 | 50 | 50 |

## Representative coverage

- Types: white 26, red 8, rose 13, sparkling 2
- Vintage present / non-vintage: 31 / 19
- Stored price present: 29
- Multiple stored links: 1
- Target wine included: yes

## Sample records

| ID | Wine | Status | Factual | Gates |
|---:|---|---|---:|---|
| 418 | Zestrea Muscat Ottonel Demisec, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING |
| 387 | Sable Noble Roșu | partial | 73% | — |
| 388 | Sable Noble Roze | partial | 75% | — |
| 389 | Sable Noble Alb | partial | 79% | — |
| 396 | Statornic Sauvignon Blanc, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 397 | Statornic Cabernet Sauvignon Roze, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 398 | Statornic Pinot Noir, Murfatlar, 0.75L | complete | 88% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 399 | Statornic Merlot, Murfatlar, 0.75L | complete | 85% | — |
| 400 | Statornic Riesling Italian, Murfatlar, 0.75L | complete | 85% | GENERIC_AI_FACT, INCOMPLETE_PUBLIC_RENDERING |
| 409 | Zestrea Cabernet Sauvignon, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 410 | Zestrea Pinot Noir, Murfatlar, 0.75L | complete | 87% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 411 | Zestrea Merlot & Cabernet Sauvignon Roze Demidulce, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 412 | Zestrea Muscat Ottonel Demidulce, Murfatlar, 0.75L | complete | 87% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 413 | Zestrea Sauvignon Blanc, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING, NON_PROFITSHARE_PRICE_EXPOSURE |
| 414 | Zestrea Fetească Neagră, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING |
| 415 | Zestrea Merlot & Cabernet Sauvignon Roze Demisec, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING |
| 416 | Zestrea Chardonnay, Murfatlar, 0.75L | complete | 85% | INCOMPLETE_PUBLIC_RENDERING |
| 417 | Zestrea Riesling Italian, Murfatlar, 0.75L | complete | 86% | INCOMPLETE_PUBLIC_RENDERING |
| 150 | Solo Quinta Alb | partial | 79% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 187 | La Stejari Merlot | complete | 90% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 149 | Solo Quinta Roze | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 151 | Muse Stars Rosè (Spumant) | complete | 89% | GENERIC_AI_FACT |
| 153 | Muse Night | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 159 | Schwaben Wein Roze | partial | 83% | — |
| 161 | Conacul Ambrozy Sauvignon Blanc | partial | 82% | — |
| 162 | Muse Stars Brut (Spumant) | complete | 87% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 199 | EXPLICIT Rară Neagră & Merlot | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 152 | Muse Day | complete | 88% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 154 | Sole Roze | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 155 | IMPLICIT Roze | complete | 89% | — |
| 156 | EXPLICIT Roze | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 157 | Castel Huniade Roze | partial | 79% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 158 | Schwaben Wein Roze Demisec | partial | 76% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 160 | La Stejari Chardonnay | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 163 | Muse White | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 164 | Muse White Magnum | complete | 89% | — |
| 165 | Sole Chardonnay | complete | 88% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 166 | Sole Fetească Regală | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 167 | Sole Orange Wine | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 168 | Sole Viognier | complete | 88% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 169 | Sole Sauvignon Blanc | complete | 88% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 170 | IMPLICIT Aligoté | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 171 | IMPLICIT Chardonnay | complete | 88% | — |
| 172 | IMPLICIT Pinot Grigio | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 173 | IMPLICIT Sauvignon Blanc | complete | 88% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 174 | EXPLICIT Sauvignon Blanc | complete | 88% | — |
| 175 | EXPLICIT Chardonnay | complete | 88% | — |
| 177 | EXPLICIT Fetească Regală | complete | 89% | — |
| 178 | EXPLICIT Muscat ottonel | complete | 89% | — |
| 179 | Castel Huniade Riesling | complete | 89% | — |

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