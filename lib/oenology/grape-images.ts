import type { AppLocale } from "@/i18n/locale";
import type { GrapeGalleryImage, GrapeGuide } from "@/lib/oenology/types";

interface GrapeImageSeed {
  slug: string;
  kind: "photo" | "illustration";
  alt: Record<AppLocale, string>;
  credit: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
  gallery?: GrapeGalleryImage[];
}

const ILLUSTRATION_SOURCE = "/images/grapes/README.md";
const ILLUSTRATION_CREDIT = "VinIntel (ilustrație originală)";
const ILLUSTRATION_LICENSE = "© VinIntel. Ilustrație originală, licență internă.";
const PHOTO_DIR = "/images/grapes/photos";

function illustration(
  slug: string,
  alt: Record<AppLocale, string>,
): GrapeImageSeed {
  return {
    slug,
    kind: "illustration",
    alt,
    credit: ILLUSTRATION_CREDIT,
    sourceUrl: ILLUSTRATION_SOURCE,
    license: ILLUSTRATION_LICENSE,
  };
}

/**
 * Curated first set. Photos are downloaded from Wikimedia Commons, optimized to
 * local WebP assets and attributed below. A missing photo uses the original
 * VinIntel botanical illustration rather than an unrelated stock grape photo.
 */
export const GRAPE_IMAGE_SEEDS: GrapeImageSeed[] = [
  {
    slug: "feteasca-neagra",
    kind: "photo",
    alt: {
      ro: "Fotografie cu un ciorchine de Feteasca Neagra pe viță, cu boabe violet închis",
      en: "Photograph of a Feteasca Neagra grape cluster on the vine with dark violet berries",
    },
    credit: "Ensenator / Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Feteasc%C4%83_neagr%C4%83.JPG",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    slug: "feteasca-alba",
    kind: "photo",
    alt: {
      ro: "Fotografie cu ciorchini de Feteasca Alba pe viță, cu boabe galben-verzui",
      en: "Photograph of Feteasca Alba grape clusters on the vine with yellow-green berries",
    },
    credit: "SenatorulX / Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Feteasc%C4%83_alb%C4%83.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    slug: "feteasca-regala",
    kind: "photo",
    alt: {
      ro: "Fotografie cu un ciorchine de Feteasca Regala pe viță, cu boabe verzi-deschise",
      en: "Photograph of a Feteasca Regala grape cluster on the vine with light green berries",
    },
    credit: "SenatorulX / Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Feteasc%C4%83_regal%C4%83.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  illustration("tamaioasa-romaneasca", {
    ro: "Ciorchine de Tamaioasa Romaneasca cu boabe aurii și note roz",
    en: "Tamaioasa Romaneasca grape cluster with golden berries and pink tones",
  }),
  illustration("grasa-de-cotnari", {
    ro: "Ciorchine de Grasa de Cotnari cu boabe mari, aurii",
    en: "Grasa de Cotnari grape cluster with large golden berries",
  }),
  illustration("cramposie-selectionata", {
    ro: "Ciorchine de Cramposie Selectionata cu boabe verzi și galbene",
    en: "Cramposie Selectionata grape cluster with green and yellow berries",
  }),
  illustration("negru-de-dragasani", {
    ro: "Ciorchine de Negru de Dragasani cu boabe bleu-negru",
    en: "Negru de Dragasani grape cluster with blue-black berries",
  }),
  illustration("novac", {
    ro: "Ciorchine de Novac cu boabe violet profund",
    en: "Novac grape cluster with deep violet berries",
  }),
  illustration("busuioaca-de-bohotin", {
    ro: "Ciorchine de Busuioaca de Bohotin cu boabe roz-violet",
    en: "Busuioaca de Bohotin grape cluster with rose-violet berries",
  }),
  illustration("cadarca", {
    ro: "Ciorchine de Cadarca cu boabe roșu-închis",
    en: "Cadarca grape cluster with dark red berries",
  }),
  illustration("mustoasa-de-maderat", {
    ro: "Ciorchine de Mustoasa de Maderat cu boabe aurii",
    en: "Mustoasa de Maderat grape cluster with golden berries",
  }),
  {
    slug: "babeasca-neagra",
    kind: "photo",
    alt: {
      ro: "Fotografie cu un ciorchine de Rara Neagra (Babeasca Neagra) pe viță",
      en: "Photograph of a Rara Neagra (Babeasca Neagra) grape cluster on the vine",
    },
    credit: "Lebowskyclone / Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:RaraNeagra-tight.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  illustration("sarba", {
    ro: "Ciorchine de Sarba cu boabe galben-verzui",
    en: "Sarba grape cluster with yellow-green berries",
  }),
];

const IMAGES_BY_SLUG = new Map(
  GRAPE_IMAGE_SEEDS.map((seed) => {
    const primaryImageUrl =
      seed.kind === "photo"
        ? `${PHOTO_DIR}/${seed.slug}.webp`
        : `/images/grapes/${seed.slug}.webp`;
    const primaryImageAlt = {
      ro:
        seed.kind === "photo"
          ? seed.alt.ro
          : `Ilustrație reprezentativă: ${seed.alt.ro}`,
      en:
        seed.kind === "photo"
          ? seed.alt.en
          : `Representative illustration: ${seed.alt.en}`,
    };
    return [
      seed.slug,
      {
        primaryImageUrl,
        primaryImageAlt,
        imageCredit: seed.credit,
        imageSourceUrl: seed.sourceUrl,
        imageLicense: seed.license,
        imageLicenseUrl: seed.licenseUrl,
        imageKind: seed.kind,
        galleryJson: seed.gallery ?? [],
        imageUrl: primaryImageUrl,
        imageAlt: primaryImageAlt,
        imageSource: `${seed.credit} · ${seed.license}`,
      },
    ] as const;
  }),
);

export function withGrapeImage(guide: GrapeGuide): GrapeGuide {
  const image = IMAGES_BY_SLUG.get(guide.slug);
  return image ? { ...guide, ...image } : guide;
}

export function resolveGrapeImage(
  guide: Pick<
    GrapeGuide,
    | "slug"
    | "primaryImageUrl"
    | "primaryImageAlt"
    | "imageCredit"
    | "imageSourceUrl"
    | "imageLicense"
    | "imageLicenseUrl"
    | "imageKind"
    | "galleryJson"
    | "imageUrl"
    | "imageAlt"
    | "imageSource"
  >,
  locale: AppLocale,
): {
  src: string | null;
  alt: string;
  credit: string | null;
  sourceUrl: string | null;
  license: string | null;
  licenseUrl: string | null;
  kind: "photo" | "illustration" | null;
  gallery: GrapeGalleryImage[];
} {
  const fallbackName = guide.slug.replace(/-/g, " ");
  const src = guide.primaryImageUrl?.trim() || guide.imageUrl?.trim() || null;
  return {
    src,
    alt:
      guide.primaryImageAlt?.[locale]?.trim() ||
      guide.imageAlt?.[locale]?.trim() ||
      (locale === "ro"
        ? `Imagine reprezentativă a soiului ${fallbackName}`
        : `Representative image of ${fallbackName}`),
    credit: guide.imageCredit?.trim() || guide.imageSource?.trim() || null,
    sourceUrl: guide.imageSourceUrl?.trim() || null,
    license: guide.imageLicense?.trim() || null,
    licenseUrl: guide.imageLicenseUrl?.trim() || null,
    kind: guide.imageKind ?? null,
    gallery: guide.galleryJson ?? [],
  };
}
