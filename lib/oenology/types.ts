import type { AppLocale } from "@/i18n/locale";

export type GrapeColor = "red" | "white" | "rose";

export interface GrapeFact {
  label: string;
  value: string;
}

export interface GrapeFaqItem {
  question: string;
  answer: string;
}

export interface GrapeSource {
  label: string;
  href?: string;
}

export interface GrapeGuideCopy {
  name: string;
  alsoKnownAs: string[];
  metaTitle: string;
  metaDescription: string;
  answer: string;
  intro: string;
  inTheGlass: string;
  origin: string;
  inRomania: string;
  pairing: string;
  howToChoose: string;
  facts: GrapeFact[];
  faq: GrapeFaqItem[];
  sources: GrapeSource[];
}

export interface GrapeGuide {
  slug: string;
  color: GrapeColor;
  isIndigenous: boolean;
  styleProfileId: string | null;
  aliases: string[];
  relatedSlugs: string[];
  pairingDishSlugs: string[];
  journalSlugs: string[];
  copy: Record<AppLocale, GrapeGuideCopy>;
}
