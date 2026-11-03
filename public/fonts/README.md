# Self-hosted fonts

These are the exact WOFF2 subsets that `next/font/google` emitted for the site,
copied to stable public paths so the root layout can preload the two fonts that
paint above the fold (the hero H1 and body copy). Stable URLs are required
because `next/font` content-hashes its emitted files, and the App Router font
preload manifest is empty in this build.

| File | Family | Subset |
| --- | --- | --- |
| `playfair-display-latin.woff2` | Playfair Display | Latin |
| `playfair-display-latin-ext.woff2` | Playfair Display | Latin Extended |
| `geist-latin.woff2` | Geist | Latin |
| `geist-latin-ext.woff2` | Geist | Latin Extended |

`OFL.txt` covers both families (SIL Open Font License 1.1). The unicode ranges
and fallback metrics in `app/globals.css` match the generated `next/font`
declarations.

Preload is served by `middleware.ts` as a `Link` response header; long-lived
cache headers are set in `next.config.ts` under `/fonts/:path*`.
