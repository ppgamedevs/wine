# Soiuri grape photos

## Before

The `/soiuri` cards were text-only: colour badge, optional `Autohton`, variety
name, three-line description and catalog wine count. The directory was legible
but visually indistinguishable from a text directory.

## After

Cards now use real licensed grape-variety photos where available. The image sits
in a fixed, premium image well on the right/top-right; badges, name, description
and catalog count remain unchanged. The visible **Ilustrație / Illustration**
label is removed for photos and remains only for fallback illustrations.

- mobile: 88 px image well; desktop: 128 px;
- fixed aspect ratio and `next/image` sizes prevent layout shift;
- failed images fall back to a restrained inline grape icon;
- `/soiuri/[slug]` now has a responsive hero image, optional gallery support and
  a subtle credit/license/source block.

Before: [desktop](soiuri-card-before-desktop.png) · [mobile](soiuri-card-before-mobile.png)
After: [desktop](soiuri-card-desktop.png) · [mobile](soiuri-card-mobile.png)
Detail: [desktop](soiuri-detail-desktop.png) · [mobile](soiuri-detail-mobile.png)

## Data model

`GrapeGuide` stores:

- `primaryImageUrl`
- `primaryImageAlt` (RO/EN)
- `imageCredit`
- `imageSourceUrl`
- `imageLicense`
- `imageLicenseUrl` (optional, needed for CC links)
- `imageKind: "photo" | "illustration"`
- `galleryJson` (optional 1–3 additional images with alt/credit/source/license)

Legacy `imageUrl` / `imageAlt` / `imageSource` aliases remain populated for
existing cards. The encyclopedia is file-backed; no database migration is
required.

## Seed coverage

Real photos are seeded for:

- Feteasca Neagra
- Feteasca Alba
- Feteasca Regala
- Babeasca Neagra (Rara Neagra synonym)

Fallback illustrations remain for Tamaioasa Romaneasca, Grasa de Cotnari,
Cramposie Selectionata, Negru de Dragasani, Novac, Busuioaca de Bohotin,
Cadarca, Mustoasa de Maderat and Sarba because no attributable species-specific
photo was found. The ten requested varieties all have an image seed; the UI does
not claim a fallback is a photograph.

## Photo provenance and licensing

Photos are downloaded from Wikimedia Commons, converted/resized to local WebP
files and never hotlinked. Full attribution and source links are in
[`public/images/grapes/photos/README.md`](../public/images/grapes/photos/README.md).
The hero displays author, license (linked) and source. CC BY-SA files require
attribution and share-alike preservation on reuse; the WebP conversion is a
modification noted in that README.

- Feteasca Neagra — Ensenator, CC BY-SA 3.0
- Feteasca Alba — SenatorulX, CC BY-SA 4.0
- Feteasca Regala — SenatorulX, CC BY-SA 4.0
- Babeasca Neagra / Rara Neagra — Lebowskyclone, CC BY-SA 3.0

Fallback illustrations are original VinIntel assets with the internal licence
described in `public/images/grapes/README.md`. They are representative artwork,
not scientifically verified cultivar photographs.

## Verification

- `npx tsc --noEmit`
- `npx vitest run lib/oenology/grapes.test.ts --pool=forks`
- `npm run lint`
- `npm run build`
- Playwright: 25 cards, 13 images, 4 real-photo alt texts, 9 illustration
  labels, detail hero credit visible, no desktop/mobile overflow.
