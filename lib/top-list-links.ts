export interface TopListLink {
  title: string;
  description: string;
  slug: string;
}

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
