export type JournalCategorySlug =
  | "ghiduri-incepatori"
  | "pairing-romanesc"
  | "soiuri-autohtone"
  | "povesti-crame"
  | "value-ocazii"
  | "vintage-reports";

export interface JournalCategory {
  slug: JournalCategorySlug;
  label: string;
  description: string;
}

export const JOURNAL_CATEGORIES: JournalCategory[] = [
  {
    slug: "ghiduri-incepatori",
    label: "Ghiduri pentru incepatori",
    description: "Primii pasi in lumea vinului romanesc, fara jargon inutil.",
  },
  {
    slug: "pairing-romanesc",
    label: "Pairing cu mancare romaneasca",
    description: "Ce vin alegi langa sarmale, mici, peste sau branza de burduf.",
  },
  {
    slug: "soiuri-autohtone",
    label: "Soiuri autohtone explicate",
    description: "Feteasca, Tamaioasa, Babeasca: profil, regiuni, stiluri.",
  },
  {
    slug: "povesti-crame",
    label: "Povesti din crame",
    description: "Oameni, terroir si decizii din podgoriile Romaniei.",
  },
  {
    slug: "value-ocazii",
    label: "Value & Ocazii",
    description: "Unde merita banii tai si ce vin pentru fiecare moment.",
  },
  {
    slug: "vintage-reports",
    label: "Vintage Reports",
    description: "Recolte, climat si ce inseamna anul pe eticheta.",
  },
];

export function getJournalCategory(
  slug: string,
): JournalCategory | undefined {
  return JOURNAL_CATEGORIES.find((category) => category.slug === slug);
}

export function getJournalCategoryLabel(slug: JournalCategorySlug): string {
  return getJournalCategory(slug)?.label ?? slug;
}
