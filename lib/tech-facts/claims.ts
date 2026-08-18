/**
 * Convert one source text into field-level claims. Never merge sources first.
 */
import { parseSweetnessFromText, type WineSweetnessLevel } from "@/lib/wine-tech-specs";
import type { WineSourceType } from "@/lib/source-trust";
import {
  parseAlcoholClaim,
  parseResidualSugarClaim,
  parseServingTemperatureClaim,
  parseTotalAcidityClaim,
  sourceContainsNumericClaim,
} from "@/lib/tech-facts/parse";
import { classifyProductIdentity, type ProductIdentity } from "@/lib/tech-facts/identity";
import { extractTechnicalSourceVintage } from "@/lib/tech-facts/vintage";
import type {
  TechExtractionMethod,
  TechFactClaim,
  TechFactField,
} from "@/lib/tech-facts/types";

export interface SourceExtractionInput {
  text: string;
  url: string | null;
  sourceType: WineSourceType;
  wine: ProductIdentity;
  sourceWineName?: string | null;
  documentTitle?: string | null;
  filename?: string | null;
  observedAt?: string;
  extractionMethod?: TechExtractionMethod;
}

function hashClaim(parts: Array<string | number | null>): string {
  const text = parts.map((part) => String(part ?? "")).join("|");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
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
}): TechFactClaim {
  const identity = classifyProductIdentity(input.source.wine, {
    wineName: input.sourceWineName ?? input.source.wine.wineName,
    vintage: input.sourceVintage,
    type: input.source.wine.type,
    grapes: input.source.wine.grapes,
    channel: input.source.wine.channel,
  });
  return {
    field: input.field,
    value: input.value,
    unit: input.unit,
    sourceUrl: input.source.url,
    sourceType: input.source.sourceType,
    sourceWineName: input.sourceWineName,
    sourceVintage: input.sourceVintage,
    sourceDocumentTitle: input.source.documentTitle ?? null,
    excerpt: input.excerpt,
    extractionMethod: input.method,
    identityMatchClass: identity,
    confidence: input.confidence,
    observedAt: input.source.observedAt ?? new Date().toISOString(),
    sourceHash: hashClaim([
      input.field,
      String(input.value),
      input.source.url,
      input.excerpt,
    ]),
  };
}

export function extractClaimsFromSource(input: SourceExtractionInput): TechFactClaim[] {
  const text = input.text.trim();
  if (!text) return [];

  const sourceVintage = extractTechnicalSourceVintage({
    text,
    title: input.documentTitle,
    filename: input.filename,
  });
  const sourceWineName = input.sourceWineName ?? input.wine.wineName;
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

  const sweetness = parseSweetnessFromText(input.wine.wineName, text);
  if (sweetness) {
    const excerptMatch = text.match(
      /\b(sec|demisec|demi[\s-]?sec|demidulce|demi[\s-]?dulce|dulce)\b/i,
    );
    claims.push(
      claim({
        field: "sweetness",
        value: sweetness,
        unit: null,
        excerpt: excerptMatch?.[0] ?? sweetness,
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
        confidence: 0.7,
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
  const folded = input.sourceText;
  const labelNearby = new RegExp(input.label, "i").test(folded);
  if (!labelNearby) return { accepted: false, excerpt: null };
  return { accepted: true, excerpt: `${input.label} ${input.value}` };
}

export function sweetnessFromClaim(value: string | number | string[]): WineSweetnessLevel | null {
  const text = String(Array.isArray(value) ? value[0] : value);
  if (text === "sec" || text === "demisec" || text === "demidulce" || text === "dulce") {
    return text;
  }
  return null;
}
