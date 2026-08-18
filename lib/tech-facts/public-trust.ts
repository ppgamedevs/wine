import type {
  WineFactExtractionMethod,
  WineFactField,
  WineFactIdentityMatch,
} from "@/lib/schema";
import { techValuesEqual } from "@/lib/tech-facts/types";

/**
 * Public technical policy:
 * - the factual table may show catalog-only values with an explicit warning;
 * - derived public claims and machine-readable facts use verified values only;
 * - unknown stays omitted and conflict never exposes the stored value as fact.
 */
export const PUBLIC_TECH_FIELDS = [
  "alcohol",
  "acidity",
  "sugar",
  "sweetness",
  "vintage",
] as const;

export type PublicTechField = (typeof PUBLIC_TECH_FIELDS)[number];
export type PublicTechStatus =
  | "verified"
  | "catalog_only"
  | "conflict"
  | "unknown";

export interface PublicTechSource {
  url: string;
  label: string;
  productName: string | null;
  documentTitle: string | null;
  sourceVintage: number | null;
  verifiedAt: string;
}

export interface PublicTechnicalField {
  field: PublicTechField;
  value: string | number | null;
  status: PublicTechStatus;
  sourceCount: number;
  sources: PublicTechSource[];
  verifiedAt?: string;
  verifiedValue?: string | number | null;
}

export interface PublicTechnicalTrust {
  fields: Record<PublicTechField, PublicTechnicalField>;
  hasVerifiedFields: boolean;
  verifiedFieldCount: number;
  sources: PublicTechSource[];
  latestVerifiedAt?: string;
}

export interface PublicTrustWineInput {
  alcohol: number | null;
  acidity: number | null;
  sugar: number | null;
  sweetness: string | null;
  vintage: number | null;
}

export interface PublicTrustEvidenceInput {
  field: WineFactField;
  valueJson: string | number | string[];
  sourceUrl: string | null;
  sourceType: string;
  sourceWineName: string | null;
  sourceVintage: number | null;
  sourceDocumentTitle: string | null;
  excerpt: string;
  extractionMethod: WineFactExtractionMethod;
  identityMatchClass: WineFactIdentityMatch;
  observedAt: string;
  sourceHash: string | null;
}

const PUBLIC_SOURCE_LABELS: Record<string, string> = {
  tasting_sheet: "Fișa tehnică a producătorului",
  producer_page: "Pagina oficială a producătorului",
  producer_catalog: "Catalogul oficial al producătorului",
};

const UNSAFE_TITLE =
  /cookie|confiden[țt]ialitate|privacy|policy|termeni|terms|gdpr|newsletter|copyright|\.pdf(?:\b|$)/i;

function storedValue(
  wine: PublicTrustWineInput,
  field: PublicTechField,
): string | number | null {
  return wine[field];
}

function scalarValue(
  value: PublicTrustEvidenceInput["valueJson"],
): string | number | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizePublicUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeDocumentTitle(value: string | null): string | null {
  const title = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!title || title.length > 120 || UNSAFE_TITLE.test(title)) return null;
  return title;
}

function normalizedObservedAt(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isPublicGrade(
  wine: PublicTrustWineInput,
  evidence: PublicTrustEvidenceInput,
): boolean {
  if (!PUBLIC_SOURCE_LABELS[evidence.sourceType]) return false;
  if (evidence.extractionMethod === "legacy_producer_fact") return false;
  if (!normalizePublicUrl(evidence.sourceUrl)) return false;
  if (!evidence.excerpt.trim() || !evidence.sourceHash?.trim()) return false;
  if (evidence.sourceHash.trim().length !== 64) return false;
  if (!evidence.sourceWineName?.trim()) return false;
  if (wine.vintage != null) {
    if (
      evidence.identityMatchClass !== "EXACT_WINE_EXACT_VINTAGE" ||
      evidence.sourceVintage == null ||
      evidence.sourceVintage !== wine.vintage
    ) {
      return false;
    }
  } else if (
    evidence.identityMatchClass !== "EXACT_WINE_EXACT_VINTAGE" &&
    evidence.identityMatchClass !== "EXACT_WINE_UNDATED_SOURCE"
  ) {
    return false;
  }
  return normalizedObservedAt(evidence.observedAt) != null;
}

function toPublicSource(
  evidence: PublicTrustEvidenceInput,
): PublicTechSource | null {
  const url = normalizePublicUrl(evidence.sourceUrl);
  const verifiedAt = normalizedObservedAt(evidence.observedAt);
  const label = PUBLIC_SOURCE_LABELS[evidence.sourceType];
  if (!url || !verifiedAt || !label) return null;
  return {
    url,
    label,
    productName: evidence.sourceWineName?.trim() || null,
    documentTitle: safeDocumentTitle(evidence.sourceDocumentTitle),
    sourceVintage: evidence.sourceVintage,
    verifiedAt,
  };
}

function dedupeSources(
  evidenceRows: PublicTrustEvidenceInput[],
): PublicTechSource[] {
  const byUrl = new Map<string, PublicTechSource>();
  for (const evidence of evidenceRows) {
    const source = toPublicSource(evidence);
    if (!source) continue;
    const current = byUrl.get(source.url);
    if (!current || source.verifiedAt > current.verifiedAt) {
      byUrl.set(source.url, source);
    }
  }
  return [...byUrl.values()].sort((left, right) => {
    const protocolOrder =
      Number(right.url.startsWith("https:")) -
      Number(left.url.startsWith("https:"));
    return protocolOrder || left.url.localeCompare(right.url);
  });
}

function dedupePublicSources(sources: PublicTechSource[]): PublicTechSource[] {
  const byUrl = new Map<string, PublicTechSource>();
  for (const source of sources) {
    const current = byUrl.get(source.url);
    if (!current || source.verifiedAt > current.verifiedAt) {
      byUrl.set(source.url, source);
    }
  }
  return [...byUrl.values()].sort((left, right) =>
    left.url.localeCompare(right.url),
  );
}

function resolveField(
  wine: PublicTrustWineInput,
  evidenceRows: PublicTrustEvidenceInput[],
  field: PublicTechField,
): PublicTechnicalField {
  const stored = storedValue(wine, field);
  if (stored == null) {
    return {
      field,
      value: null,
      status: "unknown",
      sourceCount: 0,
      sources: [],
    };
  }

  const publicGrade = evidenceRows.filter(
    (evidence) =>
      evidence.field === field && isPublicGrade(wine, evidence),
  );
  const matching = publicGrade.filter((evidence) => {
    const value = scalarValue(evidence.valueJson);
    return value != null && techValuesEqual(field, value, stored);
  });
  const contradictory = publicGrade.filter((evidence) => {
    const value = scalarValue(evidence.valueJson);
    return value != null && !techValuesEqual(field, value, stored);
  });

  if (contradictory.length > 0) {
    return {
      field,
      value: null,
      status: "conflict",
      sourceCount: dedupeSources(contradictory).length,
      sources: [],
    };
  }

  const sources = dedupeSources(matching);
  if (sources.length > 0) {
    const verifiedAt = sources.reduce(
      (latest, source) =>
        source.verifiedAt > latest ? source.verifiedAt : latest,
      sources[0]!.verifiedAt,
    );
    return {
      field,
      value: stored,
      status: "verified",
      sourceCount: sources.length,
      sources,
      verifiedAt,
      verifiedValue: stored,
    };
  }

  return {
    field,
    value: stored,
    status: "catalog_only",
    sourceCount: 0,
    sources: [],
  };
}

export function resolvePublicTechnicalTrust(
  wine: PublicTrustWineInput,
  evidenceRows: PublicTrustEvidenceInput[],
): PublicTechnicalTrust {
  const fields = Object.fromEntries(
    PUBLIC_TECH_FIELDS.map((field) => [
      field,
      resolveField(wine, evidenceRows, field),
    ]),
  ) as Record<PublicTechField, PublicTechnicalField>;
  const verified = PUBLIC_TECH_FIELDS.map((field) => fields[field]).filter(
    (field) => field.status === "verified",
  );
  const sources = dedupePublicSources(
    verified.flatMap((field) => field.sources),
  );
  const latestVerifiedAt = verified
    .map((field) => field.verifiedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return {
    fields,
    hasVerifiedFields: verified.length > 0,
    verifiedFieldCount: verified.length,
    sources,
    ...(latestVerifiedAt ? { latestVerifiedAt } : {}),
  };
}

export function getVerifiedTechnicalValue(
  trust: PublicTechnicalTrust,
  field: PublicTechField,
): string | number | null {
  const resolved = trust.fields[field];
  return resolved.status === "verified" ? resolved.value : null;
}

export function publicTechStatusLabel(field: PublicTechnicalField): string {
  if (field.status === "verified") {
    return field.sourceCount > 1
      ? `Confirmat din ${field.sourceCount} surse oficiale`
      : "Verificat";
  }
  if (field.status === "catalog_only") {
    return "Sursă oficială neconfirmată";
  }
  if (field.status === "conflict") return "În verificare";
  return "Necunoscut";
}
