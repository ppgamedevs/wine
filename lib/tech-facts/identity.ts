/**
 * Product identity matching before technical evidence can be accepted.
 */
import { foldRomanianText } from "@/lib/pairing/romanian-text";
import type { IdentityMatchClass } from "@/lib/tech-facts/types";

export interface ProductIdentity {
  wineName: string;
  wineryName?: string | null;
  vintage: number | null;
  type?: string | null;
  grapes?: string[];
  bottleSizeMl?: number | null;
  sku?: string | null;
  channel?: string | null;
}

const CHANNEL_TOKENS = [
  "stonewines",
  "stonewine",
  "kolna",
  "channel",
  "horeca",
  "magnum",
  "0.375",
  "0,375",
  "375ml",
  "1.5",
  "1,5l",
  "1500",
];

function foldName(value: string): string {
  return foldRomanianText(value)
    .replace(/\b(19\d{2}|20[0-3]\d)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferChannelToken(name: string, url?: string | null): string | null {
  const haystack = foldRomanianText(`${name} ${url ?? ""}`);
  for (const token of CHANNEL_TOKENS) {
    if (haystack.includes(token)) return token;
  }
  return null;
}

function grapeOverlap(left: string[] | undefined, right: string[] | undefined): boolean {
  if (!left?.length || !right?.length) return true;
  const a = new Set(left.map((item) => foldRomanianText(item)));
  return right.some((item) => a.has(foldRomanianText(item)));
}

function typeCompatible(left?: string | null, right?: string | null): boolean {
  if (!left || !right) return true;
  const a = foldRomanianText(left);
  const b = foldRomanianText(right);
  if (a === b) return true;
  const aliases: Record<string, string> = {
    alb: "white",
    rosu: "red",
    roze: "rose",
    rose: "rose",
    spumant: "sparkling",
    orange: "orange",
  };
  return (aliases[a] ?? a) === (aliases[b] ?? b);
}

export function classifyProductIdentity(
  wine: ProductIdentity,
  source: ProductIdentity,
): IdentityMatchClass {
  const wineName = foldName(wine.wineName);
  const sourceName = foldName(source.wineName);
  const wineChannel = wine.channel ?? inferChannelToken(wine.wineName);
  const sourceChannel = source.channel ?? inferChannelToken(source.wineName);

  if (wineChannel && sourceChannel && wineChannel !== sourceChannel) {
    return "PRODUCT_MISMATCH";
  }
  if (
    wine.bottleSizeMl != null &&
    source.bottleSizeMl != null &&
    wine.bottleSizeMl !== source.bottleSizeMl
  ) {
    return "PRODUCT_MISMATCH";
  }
  if (!typeCompatible(wine.type, source.type)) {
    return "PRODUCT_MISMATCH";
  }
  if (!grapeOverlap(wine.grapes, source.grapes)) {
    return "PRODUCT_MISMATCH";
  }

  const namesClose =
    wineName.length > 0 &&
    sourceName.length > 0 &&
    (wineName === sourceName ||
      wineName.includes(sourceName) ||
      sourceName.includes(wineName));

  if (!namesClose) {
    if (sourceName.split(" ").length >= 2 && wineName.split(" ").length >= 2) {
      return "PRODUCT_MISMATCH";
    }
    return "LIKELY_WINE";
  }

  if (wine.vintage != null && source.vintage != null && wine.vintage !== source.vintage) {
    return "EXACT_WINE_DIFFERENT_VINTAGE";
  }
  if (wine.vintage != null && source.vintage == null) {
    return "EXACT_WINE_UNDATED_SOURCE";
  }
  if (wine.vintage == null || wine.vintage === source.vintage) {
    return "EXACT_WINE_EXACT_VINTAGE";
  }
  return "LIKELY_WINE";
}
