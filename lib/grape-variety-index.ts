import type { WineWithRelations } from "@/types";

export interface GrapeVarietyCatalogEntry {
  slug: string;
  name: string;
  id?: number;
  description?: string | null;
  updatedAt?: string;
  aliases?: readonly string[];
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

export function grapeIdentityKeys(
  grape: Pick<GrapeVarietyCatalogEntry, "slug" | "name" | "aliases">,
): Set<string> {
  return new Set(
    [grape.slug, grape.name, ...(grape.aliases ?? [])]
      .map((value) => normalizeGrapeIdentity(value))
      .filter((value) => value.length > 0),
  );
}

export function wineMatchesGrapeVariety(
  wine: WineWithGrapes,
  grape: GrapeVarietyCatalogEntry,
): boolean {
  const identities = grapeIdentityKeys(grape);

  return (wine.grapeVarieties ?? []).some((share) => {
    const shareSlug = share.slug
      ? normalizeGrapeIdentity(share.slug)
      : null;
    const shareName = normalizeGrapeIdentity(share.name);
    return (
      (shareSlug != null && identities.has(shareSlug)) ||
      identities.has(shareName)
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
