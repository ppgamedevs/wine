import type { GrapeVarietyCatalogEntry } from "@/lib/grape-variety-index";
import { wineMatchesGrapeVariety } from "@/lib/grape-variety-index";
import { withGrapeImage } from "@/lib/oenology/grape-images";
import { INDIGENOUS_GRAPE_GUIDES } from "@/lib/oenology/indigenous";
import { INTERNATIONAL_GRAPE_GUIDES } from "@/lib/oenology/international";
import type { GrapeGuide } from "@/lib/oenology/types";
import type { WineWithRelations } from "@/types";

export type { GrapeGuide, GrapeGuideCopy, GrapeColor } from "@/lib/oenology/types";
export {
  GRAPE_IMAGE_SEEDS,
  resolveGrapeImage,
  withGrapeImage,
} from "@/lib/oenology/grape-images";

export const GRAPE_GUIDES: GrapeGuide[] = [
  ...INDIGENOUS_GRAPE_GUIDES,
  ...INTERNATIONAL_GRAPE_GUIDES,
].map(withGrapeImage);

const GUIDES_BY_SLUG = new Map(
  GRAPE_GUIDES.map((guide) => [guide.slug, guide] as const),
);

export function getGrapeGuide(slug: string): GrapeGuide | undefined {
  return GUIDES_BY_SLUG.get(slug);
}

export function getAllGrapeGuideSlugs(): string[] {
  return GRAPE_GUIDES.map((guide) => guide.slug);
}

export function indigenousGrapeGuides(): GrapeGuide[] {
  return GRAPE_GUIDES.filter((guide) => guide.isIndigenous);
}

export function internationalGrapeGuides(): GrapeGuide[] {
  return GRAPE_GUIDES.filter((guide) => !guide.isIndigenous);
}

export function catalogEntryFromGuide(
  guide: GrapeGuide,
): GrapeVarietyCatalogEntry {
  return {
    slug: guide.slug,
    name: guide.copy.ro.name,
    aliases: [
      ...guide.aliases,
      guide.copy.en.name,
      ...guide.copy.ro.alsoKnownAs,
      ...guide.copy.en.alsoKnownAs,
    ],
  };
}

export function grapeGuidesForWine(
  wine: Pick<WineWithRelations, "grapeVarieties">,
): GrapeGuide[] {
  return GRAPE_GUIDES.filter((guide) =>
    wineMatchesGrapeVariety(wine, catalogEntryFromGuide(guide)),
  );
}
