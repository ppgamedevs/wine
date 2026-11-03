# Wine Catalog Quality Engine — production-wide read-only report

Generated: 2026-11-03T13:38:53.068Z

## Summary

- Total wines: 265
- Complete: 108
- Partial: 157
- Incomplete: 0
- Factual completeness average: 83.5%
- Verified technical coverage: 78%
- Sensory evidence coverage: 92%
- Identity conflicts: 0
- Potential duplicate groups: 0
- Missing producer sources: 0
- Qualifying affiliate price coverage: 0
- No affiliate price (separate from quality): 265
- Critical gates: 180
- Retry queue: 210
- Recently improved: 25

## Gate counts

| Gate | Count |
|---|---:|
| NON_PROFITSHARE_PRICE_EXPOSURE | 180 |
| INCOMPLETE_PUBLIC_RENDERING | 24 |
| GENERIC_AI_FACT | 10 |
| WRONG_BOTTLE_PHOTO | 2 |

## Deterministic dry-run field coverage (before → after structuring existing evidence)

| Field | Before | After | Total |
|---|---:|---:|---:|
| tasting_notes | 263 | 263 | 265 |
| serving_temperature | 28 | 28 | 265 |
| food_pairing | 54 | 54 | 265 |
| alcohol | 207 | 207 | 265 |
| source_url | 265 | 265 | 265 |

## Representative coverage

- Types: white 96, red 118, rose 36, sparkling 12
- Vintage present / non-vintage: 210 / 55
- Stored price present: 180
- Multiple stored links: 8
- Target wine included: yes

## Sample records

| ID | Wine | Status | Factual | Gates |
|---:|---|---|---:|---|
| 149 | Solo Quinta Roze | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 150 | Solo Quinta Alb | partial | 79% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 151 | Muse Stars Rosè (Spumant) | complete | 89% | GENERIC_AI_FACT |
| 152 | Muse Day | complete | 88% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 153 | Muse Night | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 154 | Sole Roze | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 155 | IMPLICIT Roze | complete | 89% | — |
| 156 | EXPLICIT Roze | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 157 | Castel Huniade Roze | partial | 79% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 158 | Schwaben Wein Roze Demisec | partial | 76% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 159 | Schwaben Wein Roze | partial | 83% | — |
| 160 | La Stejari Chardonnay | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 161 | Conacul Ambrozy Sauvignon Blanc | partial | 82% | — |
| 162 | Muse Stars Brut (Spumant) | complete | 87% | NON_PROFITSHARE_PRICE_EXPOSURE |
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
| 180 | Castel Huniade Șarbă | partial | 78% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 181 | Castel Huniade Fetească Regală | complete | 88% | — |
| 182 | Castel Huniade Sauvignon Blanc | complete | 89% | — |
| 183 | Castel Huniade Muscat Ottonel | complete | 89% | — |
| 184 | Schwaben Wein Riesling Italian | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 185 | Schwaben Wein Fetească Regală | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 186 | Schwaben Wein Muscat Ottonel | complete | 94% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 187 | La Stejari Merlot | complete | 90% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 188 | La Stejari Cabernet Sauvignon | complete | 90% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 189 | Cuvée Überland | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 190 | Selene Cabernet Sauvignon | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 191 | Selene Fetească Neagră | complete | 90% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 192 | Selene Merlot | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 193 | Selene Syrah | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 194 | Selene Cabernet Sauvignon Magnum | complete | 88% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 195 | IMPLICIT Fetească neagră | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 196 | IMPLICIT Merlot | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 197 | EXPLICIT Merlot | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 198 | EXPLICIT Cabernet Sauvignon | complete | 89% | — |
| 199 | EXPLICIT Rară Neagră & Merlot | complete | 89% | NON_PROFITSHARE_PRICE_EXPOSURE |

## Prioritized repair queue

| Priority | Wine | Action |
|---|---|---|
| P0 | cramele-recas-solo-quinta-roze-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-solo-quinta-alb-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-muse-day-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-muse-night-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-sole-roze-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-explicit-roze-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-castel-huniade-roze-2023 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-schwaben-wein-roze-demisec-2023 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-la-stejari-chardonnay-2020 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-muse-stars-brut | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-muse-white-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-sole-chardonnay-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-sole-feteasca-regala-2024 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-sole-orange-wine-2023 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-sole-viognier-2023 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-sole-sauvignon-blanc-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-implicit-aligote-2024 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-implicit-pinot-grigio-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-implicit-sauvignon-blanc-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |
| P0 | cramele-recas-castel-huniade-sarba-2025 | Ensure the public resolver returns Price unavailable; never expose a non-qualifying price. |

No database writes were performed.