import type { WineType } from "@/types";
import { upgradeBudureascaImageUrl } from "@/lib/budureasca-image-url";

const PLACEHOLDER_HOSTS = ["images.unsplash.com", "picsum.photos"] as const;

const KNOWN_OPTIMIZED_HOSTS = [
  "images.unsplash.com",
  "picsum.photos",
  "vinintel.ro",
  "public.blob.vercel-storage.com",
  "davino.ro",
  "cramele-recas.ro",
  "cramelerecas.ro",
  "cotnari.ro",
  "avincis.ro",
  "ballageza.com",
  "www.ballageza.com",
  "liliac.ro",
  "budureasca.ro",
  "lacertawinery.ro",
  "jidvei.ro",
] as const;

export interface ResolvedWineImage {
  src: string | null;
  alt: string;
  /** True when image comes from a retailer source (eMag, Avincis, etc.). */
  fromExternalSource: boolean;
  /** Bypass Next.js optimizer for retailer CDNs not in remotePatterns. */
  unoptimized: boolean;
}

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

export function isExternalSourceImage(
  imageSource: string | null | undefined,
): boolean {
  const source = imageSource?.trim();
  return Boolean(source && source !== "manual");
}

function hostnameMatchesKnownOptimizedHost(hostname: string): boolean {
  return KNOWN_OPTIMIZED_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

export function shouldUseUnoptimizedImage(
  url: string,
  fromExternalSource: boolean,
): boolean {
  if (fromExternalSource) return true;
  try {
    return !hostnameMatchesKnownOptimizedHost(new URL(url).hostname);
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
  imageSource?: string | null;
  imageAlt?: string | null;
  name: string;
  vintage?: number | null;
  type: WineType;
  winery?: { name: string } | null;
}): ResolvedWineImage {
  const alt =
    wine.imageAlt?.trim() ||
    buildWineImageAlt({
      name: wine.name,
      vintage: wine.vintage,
      wineryName: wine.winery?.name,
      type: wine.type,
    });

  const fromExternalSource = isExternalSourceImage(wine.imageSource);
  const raw = upgradeBudureascaImageUrl(wine.imageUrl?.trim() ?? null);

  if (!raw) {
    return { src: null, alt, fromExternalSource: false, unoptimized: false };
  }

  if (fromExternalSource || !isPlaceholderImageUrl(raw)) {
    return {
      src: raw,
      alt,
      fromExternalSource,
      unoptimized: shouldUseUnoptimizedImage(raw, fromExternalSource),
    };
  }

  return { src: null, alt, fromExternalSource: false, unoptimized: false };
}
