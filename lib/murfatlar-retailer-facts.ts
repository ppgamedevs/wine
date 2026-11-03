import type { TechFactClaim } from "@/lib/tech-facts/types";
import {
  wineIdentitiesMatch,
  type CanonicalWineIdentity,
} from "@/lib/wine-identity";
import type { MurfatlarWineVariant } from "@/lib/murfatlar-producer";
import { persistWineFactEvidenceFailSoft } from "@/lib/tech-facts/persist";

export interface RetailerProductFacts {
  retailer: string;
  url: string;
  title: string;
  sourceProductId: string;
  producer: string;
  range: string;
  productName: string;
  grapeVarieties: string[];
  color: CanonicalWineIdentity["color"];
  sweetness: string | null;
  bottleSizeMl: number | null;
  vintage: number | null;
  alcoholPercent: number;
  alcoholProvenance: "retailer_specification";
  producerConfirmedAlcohol: false;
  capturedAt: string;
}

export function retailerFactsMatchVariant(
  facts: RetailerProductFacts,
  variant: MurfatlarWineVariant,
): boolean {
  return wineIdentitiesMatch(variant.identity, {
    producer: facts.producer,
    range: facts.range,
    productName: facts.productName,
    grapeVarieties: facts.grapeVarieties,
    color: facts.color,
    sweetness: facts.sweetness,
    bottleSizeMl: facts.bottleSizeMl,
    vintage: facts.vintage,
    sourceProductId: null,
  });
}

export function buildRetailerAlcoholClaim(
  facts: RetailerProductFacts,
): TechFactClaim {
  const sourceHash = `retailer-alcohol:${facts.sourceProductId}:${facts.alcoholPercent}`;
  return {
    field: "alcohol",
    value: facts.alcoholPercent,
    unit: "% vol",
    sourceUrl: facts.url,
    sourceType: "retailer",
    sourceWineName: facts.title,
    sourceVintage: facts.vintage,
    sourceDocumentTitle: facts.title,
    excerpt: `${facts.retailer} specification: ${facts.alcoholPercent}% vol.`,
    extractionMethod: "manual",
    identityMatchClass: "EXACT_WINE_UNDATED_SOURCE",
    sourceNameClass: "SOURCE_NAME_EXACT",
    sourceVintageClass: "SOURCE_VINTAGE_MISSING",
    confidence: 0.95,
    observedAt: facts.capturedAt,
    sourceHash,
    claimIdentityHash: sourceHash,
  };
}

/**
 * Store retailer-reported alcohol as evidence, never as a producer fact.
 * It deliberately does not update wines.alcohol.
 */
export async function storeRetailerAlcoholEvidence(
  wineId: number,
  facts: RetailerProductFacts,
): Promise<number> {
  if (facts.producerConfirmedAlcohol) {
    throw new Error("Retailer evidence cannot be marked producer-confirmed.");
  }
  return persistWineFactEvidenceFailSoft(wineId, [buildRetailerAlcoholClaim(facts)]);
}
