import type { WineWithRelations } from "@/types";

export interface GrapeVarietyCatalogEntry {
  slug: string;
  name: string;
}

export interface IndexableGrapeVariety extends GrapeVarietyCatalogEntry {
  wineCount: number;
}

type WineWithGrapes = Pick<WineWithRelations, "grapeVarieties">;

export function normalizeGrapeIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wineMatchesGrapeVariety(
  wine: WineWithGrapes,
  grape: GrapeVarietyCatalogEntry,
): boolean {
  const canonicalSlug = normalizeGrapeIdentity(grape.slug);
  const canonicalName = normalizeGrapeIdentity(grape.name);

  return (wine.grapeVarieties ?? []).some((share) => {
    const shareSlug = share.slug
      ? normalizeGrapeIdentity(share.slug)
      : null;
    const shareName = normalizeGrapeIdentity(share.name);
    return (
      shareSlug === canonicalSlug ||
      shareName === canonicalName ||
      shareName === canonicalSlug
    );
  });
}

export function filterWinesByGrapeVariety<T extends WineWithGrapes>(
  wines: T[],
  grape: GrapeVarietyCatalogEntry,
): T[] {
  return wines.filter((wine) => wineMatchesGrapeVariety(wine, grape));
}

export function getIndexableGrapeVarieties<T extends WineWithGrapes>(
  wines: T[],
  grapes: GrapeVarietyCatalogEntry[],
  minimumWineCount: number,
): IndexableGrapeVariety[] {
  return grapes
    .map((grape) => ({
      ...grape,
      wineCount: filterWinesByGrapeVariety(wines, grape).length,
    }))
    .filter((grape) => grape.wineCount >= minimumWineCount)
    .sort(
      (a, b) =>
        b.wineCount - a.wineCount || a.slug.localeCompare(b.slug, "ro"),
    );
}
