/**
 * Golden editorial dataset from the first 30 human-reviewed wines.
 * Test / product intelligence only. Production foodPairings remain source of truth.
 */
import type { FoodPairingBasis, FoodPairingStrength } from "@/lib/schema";
import raw from "@/lib/pairing/fixtures/golden-curation-batch-1.json";

export const GOLDEN_CURATION_BATCH_ID = "batch-1";
export const GOLDEN_HISTORICAL_REJECTIONS = "unknown" as const;

export interface GoldenPairingRecord {
  dish: string;
  category: string | null;
  note: string | null;
  strength: FoodPairingStrength | null;
  source: string | null;
  basis: FoodPairingBasis[];
  curatedAt: string | null;
  curatedBy: string | null;
  family: string | null;
}

export interface GoldenWineRecord {
  slug: string;
  name: string;
  winery: string;
  winerySlug: string;
  vintage: number | null;
  type: string;
  sweetness: string | null;
  grapes: string[];
  producerCulinary: string | null;
  pairings: GoldenPairingRecord[];
}

interface RawAudit {
  records: Array<{
    slug: string;
    name: string;
    winery: string;
    winerySlug: string;
    vintage: number | null;
    type: string;
    sweetness: string | null;
    grapes: string[];
    producerCulinary: string | null;
    pairings: GoldenPairingRecord[];
  }>;
}

const audit = raw as RawAudit;

export const GOLDEN_CURATION_WINES: GoldenWineRecord[] = audit.records.map((wine) => ({
  slug: wine.slug,
  name: wine.name,
  winery: wine.winery,
  winerySlug: wine.winerySlug,
  vintage: wine.vintage,
  type: wine.type,
  sweetness: wine.sweetness,
  grapes: wine.grapes,
  producerCulinary: wine.producerCulinary,
  pairings: wine.pairings,
}));

export const GOLDEN_CURATION_STATS = {
  wines: GOLDEN_CURATION_WINES.length,
  pairings: GOLDEN_CURATION_WINES.reduce((sum, wine) => sum + wine.pairings.length, 0),
  historicalRejections: GOLDEN_HISTORICAL_REJECTIONS,
} as const;

export function goldenDishFrequency(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const wine of GOLDEN_CURATION_WINES) {
    for (const pairing of wine.pairings) {
      counts.set(pairing.dish, (counts.get(pairing.dish) ?? 0) + 1);
    }
  }
  return counts;
}

export function goldenSpecificityPrior(dishId: string): number {
  const genericIds = new Set([
    "sarmale",
    "telemea",
    "salata-de-icre",
    "peste-la-cuptor",
    "aperitive",
    "fructe-de-mare",
  ]);
  if (genericIds.has(dishId)) return -1;
  const specificIds = new Set([
    "salata-de-icre-de-stiuca",
    "salata-de-icre-de-crap",
    "telemea-de-capra",
    "sarmale-in-foi-de-vita",
    "ciulama-de-ciuperci",
    "hamsii",
    "tocanita-de-vanat",
    "piept-de-rata",
    "tocana-de-porc-cu-prune",
  ]);
  if (specificIds.has(dishId)) return 3;
  return 0;
}
