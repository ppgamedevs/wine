import type {
  WineClaimField,
  WineSourceClass,
  WineClaimVerificationStatus,
} from "@/lib/schema";
import type { CanonicalWineIdentity } from "@/lib/wine-identity";
import type { IdentityMatchClass } from "@/lib/tech-facts/types";

export type { WineClaimField, WineSourceClass, WineClaimVerificationStatus };

export type IntelligenceField = WineClaimField;

export type ClaimValue =
  | string
  | number
  | string[]
  | Record<string, unknown>;

export type SourceAvailability =
  | "available"
  | "unavailable"
  | "blocked"
  | "requires_auth"
  | "rate_limited"
  | "skipped";

export type SourceContentKind = "html" | "text" | "json" | "pdf_text";

export interface SourceFixture {
  url: string;
  title: string;
  kind: SourceContentKind;
  body: string;
  observedAt?: string;
  robotsAllowed?: boolean;
  requiresAuth?: boolean;
  rateLimited?: boolean;
  classification?: WineSourceClass;
}

export interface DiscoveredSource {
  url: string;
  title: string;
  classification: WineSourceClass;
  discoveredFrom: string;
  priority: number;
  availability: SourceAvailability;
  availabilityReason: string | null;
  contentKind: SourceContentKind | null;
  fixture: SourceFixture | null;
}

export interface WineIntelligenceInput {
  id: number;
  slug: string;
  name: string;
  producer: string;
  range: string | null;
  vintage: number | null;
  color: string | null;
  sweetness: string | null;
  grapeVarieties: string[];
  bottleSizeMl: number | null;
  sourceUrl?: string | null;
  producerPageUrl?: string | null;
  region?: string | null;
  country?: string | null;
  currentFacts?: Partial<Record<IntelligenceField, ClaimValue>>;
}

export interface WineClaim {
  wineId: number;
  canonicalIdentityKey: string;
  identity: CanonicalWineIdentity;
  field: IntelligenceField;
  value: ClaimValue;
  normalizedValue: string;
  unit: string | null;
  sourceUrl: string;
  sourceTitle: string;
  sourceClass: WineSourceClass;
  excerpt: string;
  observedAt: string;
  extractionMethod: "deterministic" | "constrained_llm" | "manual" | "existing_record";
  identityMatchStatus: IdentityMatchClass;
  confidence: number;
  sourceHash: string;
  claimHash: string;
}

export interface ClaimConflict {
  status: "none" | "conflict";
  field: IntelligenceField;
  values: Array<{
    value: string;
    sources: Array<{ url: string; sourceClass: WineSourceClass }>;
  }>;
}

export interface ReconciledClaim {
  field: IntelligenceField;
  value: ClaimValue | null;
  normalizedValue: string | null;
  unit: string | null;
  verificationStatus: WineClaimVerificationStatus;
  confidence: number;
  sourceClass: WineSourceClass | null;
  sourceUrl: string | null;
  claims: WineClaim[];
  conflict: ClaimConflict | null;
}

export interface CompletenessField {
  field: IntelligenceField;
  required: boolean;
  present: boolean;
  verified: boolean;
  value: ClaimValue | null;
  verificationStatus: WineClaimVerificationStatus | null;
}

export interface CompletenessReport {
  wineId: number;
  scorePercent: number;
  presentCount: number;
  requiredCount: number;
  missingFields: IntelligenceField[];
  unverifiedFields: IntelligenceField[];
  fields: CompletenessField[];
  byGroup: Record<string, { present: number; total: number; percent: number }>;
}

export interface SourceResult {
  source: DiscoveredSource;
  status: SourceAvailability;
  claims: WineClaim[];
  error: string | null;
  requestCount: number;
  cached: boolean;
}

export interface AiCostEstimate {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  model: string;
}

export interface AiInterpretation {
  text: string;
  model: string;
  supportedClaimHashes: string[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface IntelligenceReport {
  wineId: number;
  wineName: string;
  generatedAt: string;
  dryRun: boolean;
  runId: string;
  fingerprint: string;
  sources: SourceResult[];
  claims: WineClaim[];
  reconciled: ReconciledClaim[];
  completeness: CompletenessReport;
  aiEstimate: AiCostEstimate;
  aiInterpretation: AiInterpretation | null;
  errors: string[];
  requestCount: number;
  sourceCoverage: Record<
    string,
    { available: number; unavailable: number; blocked: number; requiresAuth: number }
  >;
  beforeAfter: {
    before: Partial<Record<IntelligenceField, ClaimValue>>;
    after: Partial<Record<IntelligenceField, ClaimValue>>;
    addedFields: IntelligenceField[];
    changedFields: IntelligenceField[];
  };
  mutationPlan: {
    claimsToInsert: number;
    claimsToUpdate: number;
    technicalMirrorCount: number;
    aiInterpretationsToInsert: number;
    runsToInsert: number;
  };
}

export const INTELLIGENCE_FIELD_GROUPS: Record<string, IntelligenceField[]> = {
  core: [
    "producer",
    "range",
    "product_name",
    "grape_varieties",
    "vintage",
    "bottle_volume",
    "wine_color",
    "sweetness",
    "alcohol",
    "appellation",
    "region",
    "country",
    "serving_temperature",
  ],
  sensory: [
    "visual_appearance",
    "aroma_descriptors",
    "taste_descriptors",
    "body",
    "acidity_perception",
    "tannin_perception",
    "finish",
  ],
  production: [
    "grape_percentages",
    "winemaking_method",
    "oak_treatment",
  ],
  commercial: ["food_pairing", "awards", "cellaring", "allergens", "other_product_info"],
};

export const ALL_INTELLIGENCE_FIELDS: IntelligenceField[] = [
  ...INTELLIGENCE_FIELD_GROUPS.core,
  ...INTELLIGENCE_FIELD_GROUPS.sensory,
  ...INTELLIGENCE_FIELD_GROUPS.production,
  ...INTELLIGENCE_FIELD_GROUPS.commercial,
];

export const REQUIRED_FIELDS: IntelligenceField[] = [
  "producer",
  "range",
  "product_name",
  "grape_varieties",
  "bottle_volume",
  "wine_color",
  "sweetness",
  "alcohol",
  "appellation",
  "region",
  "country",
  "serving_temperature",
  "visual_appearance",
  "aroma_descriptors",
  "taste_descriptors",
];

export function normalizeClaimValue(value: ClaimValue): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join(" | ");
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
