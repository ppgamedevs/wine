# Soiuri grape cards: visual upgrade

## Before

The `/soiuri` cards were text-only: color badge, optional `Autohton`, variety
name, three-line description and catalog wine count. The directory was legible
but visually indistinguishable from a text directory.

## After

Each curated variety now has a transparent-background botanical grape
illustration on the right/top-right of the card:

- identical composition and soft neutral image well across cards;
- color palette reflects the variety (dark berries for reds, green-gold for
  whites, rose tones for Busuioaca);
- text remains the dominant element and keeps its badges, name, description and
  wine count;
- mobile uses an 88 px image, desktop 128 px;
- no layout shift: the image well has a fixed aspect ratio and
  `next/image` `sizes`;
- missing or failed images fall back to a restrained inline grape icon.

Preview: [desktop card](soiuri-card-desktop.png) · [mobile card](soiuri-card-mobile.png)

## Data model

`GrapeGuide` now supports optional:

- `imageUrl`
- `imageAlt` (RO/EN)
- `imageSource`

The static encyclopedia remains the source of truth. `lib/oenology/grape-images.ts`
holds the curated mapping; `GRAPE_GUIDES` merges it, and both
`indigenousGrapeGuides()` and `internationalGrapeGuides()` return the enriched
guides. No DB migration is required because the encyclopedia is file-backed.

Curated first pass: Feteasca Neagra, Feteasca Alba, Feteasca Regala, Tamaioasa
Romaneasca, Grasa de Cotnari, Cramposie Selectionata, Negru de Dragasani, Novac,
Busuioaca de Bohotin and Cadarca.

## Assets and performance

- Original transparent 640×640 WebP illustrations, 21–32 KB each.
- Generated from `scripts/generate-grape-images.ts` (`npm run images:grapes`);
  no hotlinked or stock-photo assets.
- `next/image` with fixed dimensions, `quality={85}`, responsive `sizes`,
  lazy loading; first card is priority.
- Image source is announced to assistive technology via visually hidden text.

## SEO and accessibility

- Existing `/soiuri` metadata, canonical URLs and routing are unchanged.
- ItemList JSON-LD now includes an absolute `image` URL where available.
- Every image has meaningful localized alt text.
- Fallback has a screen-reader label instead of an empty decorative box.

## Verification

- `npx tsc --noEmit`
- `npx vitest run lib/oenology/grapes.test.ts --pool=forks`
- `npm run lint`
- `npm run build`
- Desktop/mobile Playwright screenshots from the production build.
