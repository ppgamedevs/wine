export type QualityCategory =
  | "identity"
  | "technical"
  | "sensory"
  | "serving"
  | "food"
  | "producer"
  | "context"
  | "evidence";

export type QualityStatus = "complete" | "partial" | "incomplete";

export type QualityGateSeverity = "critical" | "high" | "medium" | "low";

export type QualityGateCode =
  | "INCORRECT_VARIANT"
  | "SWEETNESS_MIXING"
  | "BOTTLE_SIZE_MERGE"
  | "VINTAGE_MISMATCH"
  | "ALCOHOL_CONFLICT"
  | "DUPLICATE_WINE"
  | "WRONG_BOTTLE_PHOTO"
  | "UNATTRIBUTED_TASTING_CLAIM"
  | "GENERIC_AI_FACT"
  | "MISSING_PUBLIC_SERVING_TEMP"
  | "INCOMPLETE_PUBLIC_RENDERING"
  | "NON_PROFITSHARE_PRICE_EXPOSURE";

export interface QualityGate {
  code: QualityGateCode;
  severity: QualityGateSeverity;
  message: string;
  repairAction: string;
  blocking: boolean;
}

export interface QualityWine {
  id: number;
  slug: string;
  name: string;
  producer: string | null;
  region: string | null;
  type: string;
  sweetness: string | null;
  vintage: number | null;
  grapeVarieties: string[];
  alcohol: number | null;
  sugar: number | null;
  acidity: number | null;
  volumeMl: number | null;
  tastingNotes: string | null;
  descriptionEditorial: string | null;
  foodPairings: string[];
  servingTemperature: string | null;
  sourceUrl: string | null;
  producerPageUrl: string | null;
  tastingSheetUrl: string | null;
  imageUrl: string | null;
  priceAvg: number | null;
  currentPrice: number | null;
  affiliateLinks: Array<{
    retailer?: string;
    url?: string;
    priceRon?: number;
    checkedAt?: string;
    inStock?: boolean;
  }>;
  evidenceFields: string[];
  /** Structured V2 claim fields for this exact wine. */
  claimFields: string[];
  updatedAt: string | null;
  hasQualifiedProfitshareOffer: boolean;
}

export interface QualityCategoryResult {
  category: QualityCategory;
  applicable: number;
  present: number;
  percent: number;
  missing: string[];
  presentFields: string[];
}

export interface QualityAssessment {
  wine: QualityWine;
  status: QualityStatus;
  factualScore: number;
  categories: QualityCategoryResult[];
  gates: QualityGate[];
  repairQueue: Array<{
    priority: "P0" | "P1" | "P2";
    action: string;
    fields: string[];
  }>;
  commercial: {
    hasQualifiedProfitshareOffer: boolean;
    priceCoverage:
      | "affiliate"
      | "unavailable"
      | "unqualified_affiliate"
      | "non_affiliate_only";
    note: string;
  };
  sourceGaps: Array<{
    field: string;
    preferredSources: string[];
    reason: string;
  }>;
}

export interface CatalogQualitySummary {
  totalWines: number;
  complete: number;
  partial: number;
  incomplete: number;
  verifiedTechnicalCoverage: number;
  sensoryEvidenceCoverage: number;
  identityConflicts: number;
  potentialDuplicates: number;
  missingProducerSources: number;
  affiliatePriceCoverage: number;
  noAffiliatePrice: number;
  recentlyImproved: number;
  criticalGates: number;
  retryQueue: number;
  factualCompletenessAverage: number;
}

export interface CatalogQualityReport {
  generatedAt: string;
  summary: CatalogQualitySummary;
  assessments: QualityAssessment[];
  gateCounts: Record<string, number>;
  duplicateGroups: Array<{ key: string; wineIds: number[]; names: string[] }>;
  retryQueue: Array<{
    wineId: number;
    slug: string;
    priority: "P0" | "P1" | "P2";
    action: string;
    reason: string;
  }>;
}

export const CATEGORY_FIELDS: Record<QualityCategory, string[]> = {
  identity: ["name", "producer", "type", "sweetness", "vintage", "grape_varieties"],
  technical: ["alcohol", "sugar", "acidity", "bottle_volume"],
  sensory: ["tasting_notes", "visual", "aroma", "taste", "body", "acidity_perception", "tannin", "finish"],
  serving: ["serving_temperature"],
  food: ["food_pairing"],
  producer: ["producer", "producer_source"],
  context: ["grape_varieties", "region"],
  evidence: ["source_url", "evidence_fields", "tasting_attribution"],
};
