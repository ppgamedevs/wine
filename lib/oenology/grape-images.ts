import type { AppLocale } from "@/i18n/locale";
import type { GrapeGuide } from "@/lib/oenology/types";

interface GrapeImageSeed {
  slug: string;
  alt: Record<AppLocale, string>;
}

const SOURCE = "Ilustrație botanică originală VinIntel";

/**
 * First curated set. The files are original transparent-background WebP
 * illustrations in `public/images/grapes`, not hotlinked stock photos.
 */
export const GRAPE_IMAGE_SEEDS: GrapeImageSeed[] = [
  {
    slug: "feteasca-neagra",
    alt: {
      ro: "Ciorchine de Feteasca Neagra cu boabe violet-inchis si frunza verde",
      en: "Feteasca Neagra grape cluster with dark violet berries and a green leaf",
    },
  },
  {
    slug: "feteasca-alba",
    alt: {
      ro: "Ciorchine de Feteasca Alba cu boabe galben-verzui",
      en: "Feteasca Alba grape cluster with yellow-green berries",
    },
  },
  {
    slug: "feteasca-regala",
    alt: {
      ro: "Ciorchine de Feteasca Regala cu boabe verzi-deschise",
      en: "Feteasca Regala grape cluster with light green berries",
    },
  },
  {
    slug: "tamaioasa-romaneasca",
    alt: {
      ro: "Ciorchine de Tamaioasa Romaneasca cu boabe aurii si note roz",
      en: "Tamaioasa Romaneasca grape cluster with golden berries and pink tones",
    },
  },
  {
    slug: "grasa-de-cotnari",
    alt: {
      ro: "Ciorchine de Grasa de Cotnari cu boabe mari, aurii",
      en: "Grasa de Cotnari grape cluster with large golden berries",
    },
  },
  {
    slug: "cramposie-selectionata",
    alt: {
      ro: "Ciorchine de Cramposie Selectionata cu boabe verzi si galbene",
      en: "Cramposie Selectionata grape cluster with green and yellow berries",
    },
  },
  {
    slug: "negru-de-dragasani",
    alt: {
      ro: "Ciorchine de Negru de Dragasani cu boabe bleu-negru",
      en: "Negru de Dragasani grape cluster with blue-black berries",
    },
  },
  {
    slug: "novac",
    alt: {
      ro: "Ciorchine de Novac cu boabe violet profund",
      en: "Novac grape cluster with deep violet berries",
    },
  },
  {
    slug: "busuioaca-de-bohotin",
    alt: {
      ro: "Ciorchine de Busuioaca de Bohotin cu boabe roz-violet",
      en: "Busuioaca de Bohotin grape cluster with rose-violet berries",
    },
  },
  {
    slug: "cadarca",
    alt: {
      ro: "Ciorchine de Cadarca cu boabe rosu-inchis",
      en: "Cadarca grape cluster with dark red berries",
    },
  },
];

const IMAGES_BY_SLUG = new Map(
  GRAPE_IMAGE_SEEDS.map((seed) => [
    seed.slug,
    {
      imageUrl: `/images/grapes/${seed.slug}.webp`,
      imageAlt: seed.alt,
      imageSource: SOURCE,
    },
  ] as const),
);

export function withGrapeImage(guide: GrapeGuide): GrapeGuide {
  const image = IMAGES_BY_SLUG.get(guide.slug);
  return image ? { ...guide, ...image } : guide;
}

export function resolveGrapeImage(
  guide: Pick<GrapeGuide, "slug" | "imageUrl" | "imageAlt" | "imageSource">,
  locale: AppLocale,
): { src: string | null; alt: string; source: string | null } {
  const fallbackName = guide.slug.replace(/-/g, " ");
  return {
    src: guide.imageUrl?.trim() || null,
    alt:
      guide.imageAlt?.[locale]?.trim() ||
      `Ciorchine de struguri ${fallbackName}`,
    source: guide.imageSource?.trim() || null,
  };
}
