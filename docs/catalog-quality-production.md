# Wine Catalog Quality Engine — production-wide read-only report

Generated: 2026-11-03T17:32:40.087Z

## Summary

- Total wines: 265
- Complete: 0
- Partial: 116
- Incomplete: 149
- Factual completeness average: 49%
- Verified technical coverage: 78%
- Sensory evidence coverage: 0%
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

## Structured field coverage (no keyword inference, no data mutation)

| Field | Structured present | Total |
|---|---:|---:|
| tasting_notes | 0 | 265 |
| serving_temperature | 0 | 265 |
| food_pairing | 30 | 265 |
| alcohol | 207 | 265 |
| source_url | 265 | 265 |

This dry-run does not treat a keyword in free text as structured evidence.
The before/after backfill projection is intentionally not claimed until
migration 0028 and source-backed claims are applied.

## Representative coverage

- Types: white 96, red 118, rose 36, sparkling 12
- Vintage present / non-vintage: 210 / 55
- Stored price present: 180
- Multiple stored links: 8
- Target wine included: yes

## Sample records

| ID | Wine | Status | Factual | Gates |
|---:|---|---|---:|---|
| 149 | Solo Quinta Roze | partial | 58% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 150 | Solo Quinta Alb | incomplete | 46% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 151 | Muse Stars Rosè (Spumant) | partial | 54% | GENERIC_AI_FACT |
| 152 | Muse Day | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 153 | Muse Night | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 154 | Sole Roze | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 155 | IMPLICIT Roze | partial | 54% | — |
| 156 | EXPLICIT Roze | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 157 | Castel Huniade Roze | incomplete | 46% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 158 | Schwaben Wein Roze Demisec | incomplete | 46% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 159 | Schwaben Wein Roze | partial | 50% | — |
| 160 | La Stejari Chardonnay | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 161 | Conacul Ambrozy Sauvignon Blanc | partial | 50% | — |
| 162 | Muse Stars Brut (Spumant) | partial | 50% | NON_PROFITSHARE_PRICE_EXPOSURE |
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
| 180 | Castel Huniade Șarbă | incomplete | 46% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 181 | Castel Huniade Fetească Regală | partial | 54% | — |
| 182 | Castel Huniade Sauvignon Blanc | partial | 54% | — |
| 183 | Castel Huniade Muscat Ottonel | partial | 54% | — |
| 184 | Schwaben Wein Riesling Italian | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 185 | Schwaben Wein Fetească Regală | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 186 | Schwaben Wein Muscat Ottonel | partial | 58% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 187 | La Stejari Merlot | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 188 | La Stejari Cabernet Sauvignon | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 189 | Cuvée Überland | partial | 58% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 190 | Selene Cabernet Sauvignon | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 191 | Selene Fetească Neagră | partial | 58% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 192 | Selene Merlot | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 193 | Selene Syrah | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 194 | Selene Cabernet Sauvignon Magnum | partial | 52% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 195 | IMPLICIT Fetească neagră | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 196 | IMPLICIT Merlot | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 197 | EXPLICIT Merlot | partial | 54% | NON_PROFITSHARE_PRICE_EXPOSURE |
| 198 | EXPLICIT Cabernet Sauvignon | partial | 54% | — |
| 199 | EXPLICIT Rară Neagră & Merlot | partial | 58% | NON_PROFITSHARE_PRICE_EXPOSURE |

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