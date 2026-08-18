/**
 * Convert one source text into field-level claims. Never merge sources first.
 * Never copy the database wine name into source identity.
 */
import type { WineSourceType } from "@/lib/source-trust";
import { claimIdentityHash } from "@/lib/tech-facts/hash";
import {
  classifyAgainstSourceIdentity,
  type DatabaseWineIdentity,
} from "@/lib/tech-facts/identity";
import { classifySourceName, extractSourceIdentityFromText } from "@/lib/tech-facts/source-identity";
import {
  parseAlcoholClaim,
  parseResidualSugarClaim,
  parseServingTemperatureClaim,
  parseTotalAcidityClaim,
  sourceContainsNumericClaim,
} from "@/lib/tech-facts/parse";
import { parseSweetnessClaimFromSource } from "@/lib/tech-facts/sweetness-source";
import type {
  TechExtractionMethod,
  TechFactClaim,
  TechFactField,
} from "@/lib/tech-facts/types";
import type { WineSweetnessLevel } from "@/lib/wine-tech-specs";

export interface SourceExtractionInput {
  text: string;
  url: string | null;
  sourceType: WineSourceType;
  wine: DatabaseWineIdentity;
  sourceWineName?: string | null;
  documentTitle?: string | null;
  filename?: string | null;
  html?: string | null;
  observedAt?: string;
  extractionMethod?: TechExtractionMethod;
}

function claim(input: {
  field: TechFactField;
  value: string | number | string[];
  unit: string | null;
  excerpt: string;
  source: SourceExtractionInput;
  sourceVintage: number | null;
  sourceWineName: string | null;
  method: TechExtractionMethod;
  confidence: number;
  sourceNameClass?: TechFactClaim["sourceNameClass"];
  sourceVintageClass?: TechFactClaim["sourceVintageClass"];
}): TechFactClaim {
  const extracted = extractSourceIdentityFromText({
    text: input.source.text,
    title: input.source.documentTitle,
    filename: input.source.filename,
    html: input.source.html,
  });
  const sourceWineName = input.sourceWineName ?? extracted.sourceWineName;
  const sourceVintage = input.sourceVintage ?? extracted.sourceVintage;
  const nameClass = classifySourceName(input.source.wine.wineName, sourceWineName);
  const identity = classifyAgainstSourceIdentity(input.source.wine, {
    ...extracted,
    sourceWineName,
    sourceVintage,
    nameClass,
  });
  const identityHash = claimIdentityHash([
    input.field,
    String(input.value),
    input.unit,
    input.source.url,
    input.source.sourceType,
    sourceWineName,
    sourceVintage,
    input.excerpt,
  ]);
  return {
    field: input.field,
    value: input.value,
    unit: input.unit,
    sourceUrl: input.source.url,
    sourceType: input.source.sourceType,
    sourceWineName,
    sourceVintage,
    sourceDocumentTitle: input.source.documentTitle ?? null,
    excerpt: input.excerpt,
    extractionMethod: input.method,
    identityMatchClass: identity,
    sourceNameClass: input.sourceNameClass ?? nameClass,
    sourceVintageClass: input.sourceVintageClass ?? extracted.vintageClass,
    confidence: input.confidence,
    observedAt: input.source.observedAt ?? new Date().toISOString(),
    sourceHash: identityHash,
    claimIdentityHash: identityHash,
  };
}

export function extractClaimsFromSource(input: SourceExtractionInput): TechFactClaim[] {
  const text = input.text.trim();
  if (!text) return [];

  const extracted = extractSourceIdentityFromText({
    text,
    title: input.documentTitle,
    filename: input.filename,
    html: input.html,
  });
  const sourceWineName = input.sourceWineName ?? extracted.sourceWineName;
  const sourceVintage = extracted.sourceVintage;
  const method = input.extractionMethod ?? "deterministic";
  const claims: TechFactClaim[] = [];

  const alcohol = parseAlcoholClaim(text);
  if (alcohol && !alcohol.ambiguous) {
    claims.push(
      claim({
        field: "alcohol",
        value: alcohol.value,
        unit: alcohol.unit,
        excerpt: alcohol.excerpt,
        source: input,
        sourceVintage,
        sourceWineName,
        method,
        confidence: 0.9,
        sourceVintageClass: extracted.vintageClass,
      }),
    );
  }

  const sugar = parseResidualSugarClaim(text);
  if (sugar && !sugar.ambiguous) {
    claims.push(
      claim({
        field: "sugar",
        value: sugar.value,
        unit: sugar.unit,
        excerpt: sugar.excerpt,
        source: input,
        sourceVintage,
        sourceWineName,
        method,
        confidence: 0.9,
      }),
    );
  }

  const acidity = parseTotalAcidityClaim(text);
  if (acidity) {
    claims.push(
      claim({
        field: "acidity",
        value: acidity.value,
        unit: acidity.unit,
        excerpt: acidity.excerpt,
        source: input,
        sourceVintage,
        sourceWineName,
        method,
        confidence: acidity.ambiguous ? 0.3 : 0.9,
      }),
    );
  }

  const sweetness = parseSweetnessClaimFromSource(text);
  if (sweetness) {
    claims.push(
      claim({
        field: "sweetness",
        value: sweetness.value,
        unit: null,
        excerpt: sweetness.excerpt,
        source: input,
        sourceVintage,
        sourceWineName,
        method,
        confidence: 0.8,
      }),
    );
  }

  if (sourceVintage != null) {
    claims.push(
      claim({
        field: "vintage",
        value: sourceVintage,
        unit: null,
        excerpt: String(sourceVintage),
        source: input,
        sourceVintage,
        sourceWineName,
        method,
        confidence: extracted.vintageClass === "SOURCE_VINTAGE_EXPLICIT" ? 0.8 : 0.4,
      }),
    );
  }

  const serving = parseServingTemperatureClaim(text);
  if (serving) {
    claims.push(
      claim({
        field: "serving_temperature",
        value: serving.value,
        unit: "C",
        excerpt: serving.excerpt,
        source: input,
        sourceVintage,
        sourceWineName,
        method,
        confidence: 0.8,
      }),
    );
  }

  return claims;
}

export function verifyAiNumericCandidate(input: {
  field: "alcohol" | "acidity" | "sugar";
  value: number;
  unit: string | null;
  sourceText: string;
  label: string;
}): { accepted: boolean; excerpt: string | null } {
  if (!sourceContainsNumericClaim(input.sourceText, input.value)) {
    return { accepted: false, excerpt: null };
  }
  if (!new RegExp(input.label, "i").test(input.sourceText)) {
    return { accepted: false, excerpt: null };
  }
  return { accepted: true, excerpt: `${input.label} ${input.value}` };
}

export function sweetnessFromClaim(value: string | number | string[]): WineSweetnessLevel | null {
  const text = String(Array.isArray(value) ? value[0] : value);
  if (text === "sec" || text === "demisec" || text === "demidulce" || text === "dulce") {
    return text;
  }
  return null;
}
