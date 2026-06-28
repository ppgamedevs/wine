import type { WineType } from "@/types";

const PLACEHOLDER_HOSTS = ["images.unsplash.com", "picsum.photos"] as const;

const TYPE_LABELS: Record<WineType, string> = {
  red: "rosu",
  white: "alb",
  rose: "rose",
  sparkling: "spumant",
  dessert: "desert",
  orange: "orange",
};

/** Temporary stock URLs from early seed; treat as missing until real bottle photos exist. */
export function isPlaceholderImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  try {
    const hostname = new URL(url).hostname;
    return PLACEHOLDER_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return true;
  }
}

export function buildWineImageAlt(input: {
  name: string;
  vintage?: number | null;
  wineryName?: string | null;
  type?: WineType;
}): string {
  const parts = [input.name];
  if (input.vintage) parts.push(String(input.vintage));
  if (input.wineryName) parts.push(`- ${input.wineryName}`);
  if (input.type) parts.push(`(${TYPE_LABELS[input.type]})`);
  return parts.join(" ");
}

export function resolveWineImage(wine: {
  slug: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  name: string;
  vintage?: number | null;
  type: WineType;
  winery?: { name: string } | null;
}): { src: string | null; alt: string } {
  const alt =
    wine.imageAlt?.trim() ||
    buildWineImageAlt({
      name: wine.name,
      vintage: wine.vintage,
      wineryName: wine.winery?.name,
      type: wine.type,
    });

  const raw = wine.imageUrl?.trim();
  const src = raw && !isPlaceholderImageUrl(raw) ? raw : null;

  return { src, alt };
}
