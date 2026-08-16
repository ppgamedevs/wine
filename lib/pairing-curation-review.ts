/**
 * Pairing curation review-session helpers.
 * Queue identity is slug-stable. Curated status comes from persisted pairings.
 */
import type { CurationCard } from "@/lib/pairing-curation-cards";

export const PAIRING_REVIEW_SKIP_STORAGE_KEY = "vinintel-pairing-review-skipped";

export type ReviewCardStatus = "curated" | "skipped" | "pending";

export interface ReviewProgress {
  reviewed: number;
  curated: number;
  skipped: number;
  pending: number;
  total: number;
}

export interface ReviewCardLike {
  slug: string;
  existingPairings: unknown[];
}

export function draftSelectionKey(slug: string, dish: string): string {
  return `${slug}:${dish}`;
}

export function reviewCardStatus(
  card: ReviewCardLike,
  skipped: string[],
): ReviewCardStatus {
  if (card.existingPairings.length > 0) return "curated";
  if (skipped.includes(card.slug)) return "skipped";
  return "pending";
}

export function reviewProgress(
  cards: ReviewCardLike[],
  skipped: string[],
): ReviewProgress {
  const curated = cards.filter((card) => card.existingPairings.length > 0).length;
  const skippedCount = cards.filter(
    (card) => reviewCardStatus(card, skipped) === "skipped",
  ).length;
  const reviewed = curated + skippedCount;
  return {
    reviewed,
    curated,
    skipped: skippedCount,
    pending: cards.length - reviewed,
    total: cards.length,
  };
}

export function resolveCurrentSlug(
  slugs: string[],
  requested?: string | null,
): string | null {
  if (requested && slugs.includes(requested)) return requested;
  return slugs[0] ?? null;
}

export function nextReviewSlug(
  slugs: string[],
  currentSlug: string,
): string | null {
  const index = slugs.indexOf(currentSlug);
  if (index < 0 || index >= slugs.length - 1) return null;
  return slugs[index + 1] ?? null;
}

export function prevReviewSlug(
  slugs: string[],
  currentSlug: string,
): string | null {
  const index = slugs.indexOf(currentSlug);
  if (index <= 0) return null;
  return slugs[index - 1] ?? null;
}

export function reviewPosition(slugs: string[], currentSlug: string): number {
  const index = slugs.indexOf(currentSlug);
  return index >= 0 ? index + 1 : 1;
}

export function approvalSuccessMessage(
  approvedCount: number,
  wineName: string,
): string {
  return `✓ ${approvedCount} asocieri salvate pentru ${wineName}.`;
}

export function reviewStrengthLabel(strength?: string): string | null {
  if (strength === "strong") return "Strong";
  if (strength === "good") return "Good";
  if (strength === "possible") return "Possible";
  return null;
}

export function reviewBasisLabel(basis?: string[]): string | null {
  if (!basis || basis.length === 0) return null;
  if (basis.includes("producer_evidence")) return "Recomandarea producatorului";
  if (basis.includes("verified_style") || basis.includes("technical_data")) {
    return "Stil verificat";
  }
  return "Judecata editoriala";
}

export function reviewPairingMeta(strength?: string, basis?: string[]): string | null {
  return [reviewStrengthLabel(strength), reviewBasisLabel(basis)]
    .filter((item): item is string => Boolean(item))
    .join(" · ") || null;
}

export function formatCuratedAt(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseSkippedSlugs(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function addSkippedSlug(skipped: string[], slug: string): string[] {
  return [...new Set([...skipped, slug])];
}

export function clearKeyedStateForSlug<T>(
  state: Record<string, T>,
  slug: string,
): Record<string, T> {
  const prefix = `${slug}:`;
  const next = { ...state };
  for (const key of Object.keys(next)) {
    if (key.startsWith(prefix)) delete next[key];
  }
  return next;
}

export function applyApprovedPairingsToCards(
  cards: CurationCard[],
  slug: string,
  pairings: CurationCard["existingPairings"],
): CurationCard[] {
  return cards.map((card) =>
    card.slug === slug ? { ...card, existingPairings: pairings } : card,
  );
}

export function mergeServerCardsPreserveOrder(
  lockedSlugs: string[],
  serverCards: CurationCard[],
  localCards: CurationCard[],
): CurationCard[] {
  const serverBySlug = new Map(serverCards.map((card) => [card.slug, card]));
  const localBySlug = new Map(localCards.map((card) => [card.slug, card]));
  return lockedSlugs.flatMap((slug) => {
    const server = serverBySlug.get(slug);
    const local = localBySlug.get(slug);
    if (!server && !local) return [];
    if (!server) return local ? [local] : [];
    if (!local) return [server];
    return [
      {
        ...server,
        existingPairings:
          server.existingPairings.length > 0
            ? server.existingPairings
            : local.existingPairings,
      },
    ];
  });
}

export function pairingCurationPath(slug: string): string {
  return `/admin/pairing-curation?slug=${encodeURIComponent(slug)}`;
}
