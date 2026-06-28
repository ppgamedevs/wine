import type { WineType } from "@/types";

/** Curated Unsplash URLs (free, hotlink OK) grouped by wine style. */
const IMAGES_BY_TYPE: Record<WineType, readonly string[]> = {
  red: [
    "https://images.unsplash.com/photo-1510817813129-b0f04dbdf3de?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506377247377-261ccd763eb0?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1553361371-873245b0d3f1?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1584910459009-feeca1480ed2?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1569529465841-df137b257a00?w=800&h=600&fit=crop&q=80",
  ],
  white: [
    "https://images.unsplash.com/photo-1566756240265-fdfb0a4d4f28?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1547595628-c58a4e45a2a9?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1587774259457-e2a3aa5a9f78?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop&q=80",
  ],
  rose: [
    "https://images.unsplash.com/photo-1558644705-70f746f5c8c2?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1569529465841-df137b257a00?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1587774259457-e2a3aa5a9f78?w=800&h=600&fit=crop&q=80",
  ],
  sparkling: [
    "https://images.unsplash.com/photo-1547595628-c58a4e45a2a9?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1558644705-70f746f5c8c2?w=800&h=600&fit=crop&q=80",
  ],
  dessert: [
    "https://images.unsplash.com/photo-1584910459009-feeca1480ed2?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1566756240265-fdfb0a4d4f28?w=800&h=600&fit=crop&q=80",
  ],
  orange: [
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1558644705-70f746f5c8c2?w=800&h=600&fit=crop&q=80",
  ],
};

const TYPE_LABELS: Record<WineType, string> = {
  red: "rosu",
  white: "alb",
  rose: "rose",
  sparkling: "spumant",
  dessert: "desert",
  orange: "orange",
};

function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministic image URL for seed data (same slug always gets same photo). */
export function getSeedImageUrl(type: WineType, slug: string): string {
  const pool = IMAGES_BY_TYPE[type];
  return pool[hashSlug(slug) % pool.length];
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
}): { src: string; alt: string } {
  const alt =
    wine.imageAlt?.trim() ||
    buildWineImageAlt({
      name: wine.name,
      vintage: wine.vintage,
      wineryName: wine.winery?.name,
      type: wine.type,
    });

  const src =
    wine.imageUrl?.trim() || getSeedImageUrl(wine.type, wine.slug);

  return { src, alt };
}
