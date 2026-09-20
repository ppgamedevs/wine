export interface TopListLink {
  title: string;
  description: string;
  slug: string;
}

/** Four Google cluster pivot pages plus high-intent programmatic hubs. */
export const SEO_PIVOT_LINKS = [
  { title: "Vinuri romanesti", href: "/vinuri", description: "Catalog complet" },
  {
    title: "Cele mai bune vinuri romanesti",
    href: "/topuri/cele-mai-bune-vinuri-romanesti",
    description: "Top general 2026",
  },
  {
    title: "Vinuri ieftine si bune",
    href: "/topuri/vinuri-sub-50-lei",
    description: "Sub 50 lei",
  },
  { title: "Crame din Romania", href: "/crame", description: "Director crame" },
  {
    title: "Regiuni viticole",
    href: "/regiuni",
    description: "Zone viticole",
  },
] as const;

export const REGION_HUB_LINKS = [
  { title: "Dealu Mare", href: "/regiuni/dealu-mare" },
  { title: "Dragasani", href: "/regiuni/dragasani" },
  { title: "Murfatlar", href: "/regiuni/murfatlar" },
  { title: "Recas", href: "/regiuni/recas" },
  { title: "Banat", href: "/regiuni/banat" },
  { title: "Minis", href: "/regiuni/minis" },
] as const;

export const TOP_LIST_INDEX_LINKS: TopListLink[] = [
  {
    title: "Cele mai bune vinuri romanesti",
    description: "Top general dupa Value Score",
    slug: "cele-mai-bune-vinuri-romanesti",
  },
  {
    title: "Cele mai bune vinuri sub 50 lei",
    description: "Valoare maxima la buget mic",
    slug: "vinuri-sub-50-lei",
  },
  {
    title: "Vinuri bune din supermarket",
    description: "Disponibile la retaileri mari",
    slug: "vinuri-bune-din-supermarket",
  },
  {
    title: "Vinuri sub 50 lei pentru sarmale",
    description: "Asocieri perfecte cu sarmale, la buget mic",
    slug: "vinuri-sub-50-lei-pentru-sarmale",
  },
  {
    title: "Cea mai buna Feteasca Neagra",
    description: "Soiul rosu emblematic al Romaniei",
    slug: "cele-mai-bune-feteasca-neagra",
  },
  {
    title: "Vinuri cadou",
    description: "Alegeri sigure pentru orice ocazie",
    slug: "vinuri-cadou",
  },
  {
    title: "Vinuri sub 100 lei pentru cina romantica",
    description: "Eleganta pentru o seara in doi",
    slug: "vinuri-sub-100-lei-pentru-cina-romantica",
  },
];

export function topListHref(slug: string): string {
  return `/topuri/${slug}`;
}
