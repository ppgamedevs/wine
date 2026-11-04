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

export type GrapeEpistemicKind =
  | "verified"
  | "generalization"
  | "interpretation";

export interface GrapeTastingProfile {
  aroma: string;
  palate: string;
  structure: string;
  finish: string;
}

export interface GrapeEditorialSection {
  id: string;
  title: string;
  body: string;
  kind: GrapeEpistemicKind;
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
  /** Premium template fields. Optional so every existing guide remains valid. */
  tastingProfile?: GrapeTastingProfile;
  editorialSections?: GrapeEditorialSection[];
  buyingChecklist?: string[];
  whatCanGoWrong?: string[];
}

export interface GrapeGalleryImage {
  url: string;
  alt: Partial<Record<AppLocale, string>>;
  credit: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
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
  primaryImageUrl?: string;
  primaryImageAlt?: Partial<Record<AppLocale, string>>;
  imageCredit?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  imageLicenseUrl?: string;
  imageKind?: "photo" | "illustration";
  galleryJson?: GrapeGalleryImage[];
  /** Legacy aliases kept for existing cards. Prefer primary* above. */
  imageUrl?: string;
  imageAlt?: Partial<Record<AppLocale, string>>;
  imageSource?: string;
}
