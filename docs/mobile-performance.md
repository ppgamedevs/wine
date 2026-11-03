# Mobile performance and Core Web Vitals

Measured on 2026-10-22 against a local production build (`next build` +
`next start`) driven by Lighthouse 12.8.2 and headless Chrome 155.

Lab numbers are simulated by Lighthouse's Lantern model. They are useful for
before/after comparison in the same environment, but they are not real-user
metrics. The observed values from Lighthouse's own trace and from an applied
throttling run are reported separately.

## What the LCP element actually is

The mobile LCP element is the hero `<h1>`:

```
Vinuri romanesti.
Clar. Onest. Rapid.
```

It is **text**, not a wine image. The original code wrapped the hero in a
framer-motion tree with `initial="hidden"` (`opacity: 0`, `translateY(20px)`),
so the server HTML contained the heading but it stayed invisible until JS
downloaded, hydrated and ran a 0.6 s staggered animation. Lighthouse attributed
**90% of the 4.7 s LCP to render delay**, not to network or image loading.

The four wine images that were preloaded (`priority={index < 4}`) were below the
fold and downloaded 1.96 MB of full-size originals while competing with that
hydration.

## Changes

### LCP / render path

- `components/hero.tsx`: converted to a Server Component and removed all
  entrance animation. The H1 is visible in the first HTML response.
- `components/smart-search-client.tsx`: removed the framer-motion wrapper and
  its 250 ms delayed fade. The search field is interactive without an opacity
  gate.
- `components/reveal.tsx`: replaced framer-motion `whileInView` with one
  IntersectionObserver + CSS transition (same fade/rise, once, on scroll).
- `components/wines/wine-image.tsx`, `components/cookie-consent/*`: replaced
  framer-motion hover/enter animations with CSS transitions.

### Images

- `components/featured-wines.tsx`: removed `priority` from below-the-fold cards.
  No wine image is preloaded on the homepage anymore.
- `components/wines/wine-catalog-directory.tsx`, `app/cauta/page.tsx`: preload
  only the first card instead of the first four/two.
- `lib/wine-images.ts` + new `lib/image-hosts.ts`: external winery/retailer
  images on allowlisted hosts now go through the Next image optimizer. Before,
  every external-source image was forced `unoptimized`, so a card downloaded a
  300–600 KB original for a ~100 px bottle.
- `next.config.ts`: `images.remotePatterns` is generated from the same host list
  as the runtime decision (no drift), and `images.qualities` adds 85 for labels.
- `components/wines/wine-card-view.tsx` and the top-list verdict card: corrected
  `sizes` for an `object-contain` bottle inside a 4:3 box (40vw/24vw/16vw instead
  of 100vw/33vw/25vw).
- `next/image` quality 85, AVIF/WebP formats and 30-day optimizer cache are
  already enabled; lazy loading is the default for all non-priority images.

Measured optimizer payload for the four homepage originals at `w=640&q=85`:

| Image | Original | Optimized |
| --- | --- | --- |
| Solo Quinta (PNG) | 625 KB | 57 KB |
| Selene Fetească Neagră | 543 KB | 30 KB |
| Miraz Roze | 307 KB | 25 KB |
| Sole Chardonnay | 483 KB | 26 KB |
| **Total** | **1958 KB** | **137 KB (-93%)** |

Chrome negotiates AVIF/WebP, so real browsers normally receive less than the
PNG/JPEG values above.

### Fonts / CLS

- Playfair Display and Geist are self-hosted from the exact subsets `next/font`
  already emitted (`public/fonts`, with OFL license).
- `middleware.ts` sends a `Link: rel=preload` header for the two Latin faces;
  `next.config.ts` serves them with `immutable` caching.
- `font-display: optional` + preload: the final face is used when available and
  a slow first visit never reflows the page. Fallback metrics match the previous
  `next/font` values.
- The decorative gold blob in the hero was bottom-anchored and moved when text
  reflowed on font load; it is now top-anchored.

### JavaScript

- framer-motion is no longer imported by any homepage component. It remains
  lazy on `/ai-sommelier` (chat animations).
- Homepage script transfer dropped from 342 KB to ~300 KB (-12%), and the
  Lighthouse total page weight from 969 KiB to ~503 KiB.
- Vercel Analytics/Speed Insights render only when `VERCEL=1`.

## Results

### Local Lighthouse mobile, simulated throttling, `/ro`

The baseline and the first optimization rounds were measured on `/ro`, which is
a 307 redirect to `/` in this app. Both sides of the comparison include that
redirect, so the delta is valid; absolute production numbers should use `/`.

| Metric | Baseline | After (3-run median) |
| --- | --- | --- |
| Performance | 81 | **90** (range 86–91) |
| FCP | 1.38 s | 1.37 s |
| LCP | 4.66 s | 3.54 s |
| TBT | 160 ms | 30 ms |
| CLS | 0.006 | **0** |
| Speed Index | 1.39 s | 1.37 s |
| Total bytes | 969 KiB | 503 KiB |

### Local Lighthouse mobile, simulated throttling, `/` (production URL shape)

Three runs: performance 87, 93, 87 (median 87); FCP 1.21 s; LCP 3.17–4.08 s;
TBT 41–62 ms; CLS 0. The LCP variance is in Lighthouse's model, not in the page:

- Lighthouse's own trace records `observedLargestContentfulPaint = 166 ms`.
- Applied devtools throttling reports LCP 2.8–3.1 s and TBT 0.7–0.8 s (the
  local machine is shared and slower than the reference device).

### Real Chrome, applied throttling (cold cache)

Slow 4G (1.6 Mbps / 150 ms RTT), 4x CPU, 390×844, Chrome 155:

| URL | FCP | LCP | CLS | TTFB |
| --- | --- | --- | --- | --- |
| `/` run 1 | 1.26 s | 1.26 s | 0 | 31 ms |
| `/` run 2 | 1.30 s | 1.30 s | 0 | 40 ms |
| `/` run 3 | 1.27 s | 1.27 s | 0 | 36 ms |

The H1 paints at first contentful paint; there is no late font/LCP entry.

### Other Lighthouse categories

- Accessibility: 100.
- Best Practices: 96 locally because the Vercel Analytics and Speed Insights
  scripts 404 on `localhost`. On a Vercel deployment those routes exist.
- SEO: 92 locally because Next 15.5 streams `<title>`/`<meta>` into the body for
  dynamic pages; the same behaviour is present on the current production site.
  Title, description, canonical, three `hreflang` alternates and three valid
  JSON-LD blocks are present after rendering. This is pre-existing and not
  changed by these optimizations.

## Remaining bottlenecks

1. **The homepage is dynamic** (`Cache-Control: private, no-store`) because the
   root layout reads the request locale. TTFB is ~200 ms locally / ~460 ms
   simulated. Making it static would require an i18n layout restructure; not
   done here to avoid SEO risk.
2. **Render-blocking CSS**: two stylesheets, ~20 KB gzip total. Lighthouse
   estimates ~250 ms. Consolidating/inlining them is a possible next step.
3. **Lantern's simulated LCP is pessimistic for this streamed RSC page** (3.2–
   4.1 s) while its own trace and real throttled Chrome paint the H1 at 1.3 s.
   Treat the simulated LCP with caution; use field data (CrUX) after deploy.
4. **Legacy/unused JS**: ~12 KiB legacy polyfills and ~31 KiB unused JS remain
   (Next runtime/radix). This is P3 and did not justify further churn.
5. `htmlLimitedBots` can force metadata into `<head>` for every request, but it
   would delay the HTML shell for all users; it was deliberately not enabled.

## Reproduce

```sh
npm run build
npx next start -p 3111

# Lighthouse, mobile, production URL shape
npx lighthouse http://127.0.0.1:3111/ \
  --only-categories=performance --form-factor=mobile \
  --throttling-method=simulate --output=json --output-path=lh.json

# All categories
npx lighthouse http://127.0.0.1:3111/ --output=json --output-path=lh-all.json
```

Use the same URL, form factor, throttling method and a local production build
when comparing runs. Lighthouse's simulated LCP varies by ~1 s between runs on
this page; report medians, not the best run.
