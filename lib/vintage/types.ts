import { normalizeIdentityText } from "@/lib/wine-identity";
import type { WineWithRelations } from "@/types";

export type VintageClassification =
  | "exceptional"
  | "favorable"
  | "mixed"
  | "difficult"
  | "insufficient";

export type VintageScope =
  | "region"
  | "appellation"
  | "grape_region"
  | "winery"
  | "wine";

export type VintageEvidenceType =
  | "winter_water"
  | "spring_frost"
  | "flowering"
  | "rain_drought"
  | "heat"
  | "disease_hail"
  | "veraison_ripening"
  | "harvest_timing_weather"
  | "sugar_acidity"
  | "phenolic_ripeness"
  | "yield_selection"
  | "producer_note"
  | "critic_review"
  | "official_report"
  | "maturity_guidance";

export type VintageImpact = "positive" | "negative" | "mixed" | "neutral";

export interface VintageEvidenceRecord {
  id?: number;
  scope: VintageScope;
  region: string | null;
  appellation: string | null;
  grape: string | null;
  wineryId: number | null;
  wineId: number | null;
  familyKey: string | null;
  vintage: number | null;
  evidenceType: VintageEvidenceType;
  impact: VintageImpact;
  sourceUrl: string;
  sourceTitle: string;
  publisher: string;
  publishedAt: string | null;
  /** Optional growing-season event date, not the publication date. */
  eventDate?: string | null;
  excerpt: string;
  confidence: number;
  producerClaim: boolean;
  independent: boolean;
  regionalException: boolean;
  maturity?: "drink_now" | "can_age" | "approaching_maturity" | "past_peak" | null;
}

export type MaturityStatus =
  | "drink_now"
  | "can_age"
  | "approaching_maturity"
  | "past_peak"
  | "insufficient";

export interface VintageSource {
  url: string;
  title: string;
  publisher: string;
  publishedAt: string | null;
  producerClaim: boolean;
  independent: boolean;
  confidence: number;
}

export interface VintageAssessment {
  classification: VintageClassification;
  confidence: number;
  reasons: string[];
  strengths: string[];
  weaknesses: string[];
  regionalExceptions: string[];
  sources: VintageSource[];
  evidenceCount: number;
  independentSourceCount: number;
  producerSourceCount: number;
  grapeSuitability: string | null;
  maturity: MaturityStatus;
  maturityText: string | null;
  timeline: Array<{
    label: string;
    evidenceType: VintageEvidenceType;
    impact: VintageImpact;
    excerpt: string;
    eventDate: string | null;
  }>;
  summaryFacts: string[];
  interpretation: string[];
  unknowns: string[];
}

export interface VintageFamilyRelease {
  id: number;
  slug: string;
  name: string;
  vintage: number | null;
  bottleSizeMl: number | null;
  grapeVarieties: string[];
  sweetness: string | null;
  type: string;
  volumeLabel: string;
}

export interface VintageFamily {
  key: string;
  producer: string;
  range: string | null;
  productBase: string;
  releases: VintageFamilyRelease[];
  differences: Array<{
    field: "blend" | "bottle_format" | "sweetness" | "color";
    detail: string;
  }>;
}

const VINTAGE_TOKEN = /\b(?:19|20)\d{2}\b/g;
const VOLUME_TOKEN = /\b\d+(?:[.,]\d+)?\s*(?:ml|l)\b/gi;

export function stripVintageAndPackaging(value: string): string {
  return value
    .replace(VINTAGE_TOKEN, " ")
    .replace(VOLUME_TOKEN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function bottleSizeMlFromName(name: string): number | null {
  const match = name.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
  if (!match?.[1]) return null;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round((match[2] ?? "ml").toLowerCase() === "l" ? amount * 1000 : amount);
}

export function wineFamilyKey(wine: {
  name: string;
  producer: string;
  range: string | null;
  color: string | null;
  sweetness: string | null;
}): string {
  return [
    normalizeIdentityText(wine.producer),
    normalizeIdentityText(wine.range ?? ""),
    normalizeIdentityText(stripVintageAndPackaging(wine.name)),
    wine.color ?? "",
    wine.sweetness ?? "",
  ].join("|");
}

function releaseFromWine(wine: WineWithRelations): VintageFamilyRelease {
  return {
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    vintage: wine.vintage ?? null,
    bottleSizeMl: bottleSizeMlFromName(wine.name),
    grapeVarieties: (wine.grapeVarieties ?? []).map((grape) => grape.name),
    sweetness: wine.sweetness ?? null,
    type: wine.type,
    volumeLabel: bottleSizeMlFromName(wine.name)
      ? `${bottleSizeMlFromName(wine.name)! / 1000} L`
      : "unknown",
  };
}

export function buildVintageFamily(
  anchor: WineWithRelations,
  candidates: WineWithRelations[],
): VintageFamily {
  const key = wineFamilyKey({
    name: anchor.name,
    producer: anchor.winery?.name ?? "",
    range: null,
    color: anchor.type,
    sweetness: anchor.sweetness,
  });
  const releases = candidates
    .filter((candidate) => {
      if (candidate.id === anchor.id) return true;
      return (
        wineFamilyKey({
          name: candidate.name,
          producer: candidate.winery?.name ?? "",
          range: null,
          color: candidate.type,
          sweetness: candidate.sweetness,
        }) === key
      );
    })
    .map(releaseFromWine)
    .sort((left, right) => (right.vintage ?? 0) - (left.vintage ?? 0));

  const differences: VintageFamily["differences"] = [];
  const grapeSets = new Set(
    releases.map((release) => [...release.grapeVarieties].sort().join("|")),
  );
  if (grapeSets.size > 1) {
    differences.push({
      field: "blend",
      detail: "Blend differs between releases; technical facts are not merged.",
    });
  }
  const volumes = new Set(releases.map((release) => release.bottleSizeMl ?? 0));
  if (volumes.size > 1) {
    differences.push({
      field: "bottle_format",
      detail: "Bottle format differs between releases; comparison is not like-for-like.",
    });
  }

  return {
    key,
    producer: anchor.winery?.name ?? "",
    range: null,
    productBase: stripVintageAndPackaging(anchor.name),
    releases,
    differences,
  };
}

export function canCompareReleases(left: VintageFamilyRelease, right: VintageFamilyRelease): boolean {
  return (
    left.id !== right.id &&
    left.bottleSizeMl === right.bottleSizeMl &&
    [...left.grapeVarieties].sort().join("|") ===
      [...right.grapeVarieties].sort().join("|") &&
    left.vintage !== right.vintage
  );
}
