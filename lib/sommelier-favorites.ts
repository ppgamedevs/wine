"use client";

const FAVORITES_KEY = "vinintel-sommelier-favorites";

export function readFavoriteSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function isFavoriteSlug(slug: string): boolean {
  return readFavoriteSlugs().includes(slug);
}

export function toggleFavoriteSlug(slug: string): boolean {
  const current = readFavoriteSlugs();
  const exists = current.includes(slug);
  const next = exists
    ? current.filter((item) => item !== slug)
    : [...current, slug];

  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("vinintel-favorites-changed"));
  return !exists;
}
