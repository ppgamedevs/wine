/**
 * Deterministic technical parsers. Prefer labeled table rows over prose.
 */
import { foldRomanianText } from "@/lib/pairing/romanian-text";

export interface ParsedTechNumber {
  value: number;
  unit: string | null;
  excerpt: string;
  ambiguous: boolean;
}

function normalizeDecimal(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function clampAlcohol(value: number): number | null {
  if (value < 8 || value > 18) return null;
  return Math.round(value * 10) / 10;
}

function clampGrams(value: number, max: number): number | null {
  if (value < 0 || value > max) return null;
  return Math.round(value * 10) / 10;
}

function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + length + 32);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function parseAlcoholClaim(text: string): ParsedTechNumber | null {
  const patterns = [
    /vol\.?\s*alc\.?[:\s]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
    /alcool[:\s]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
    /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*vol\.?/i,
    /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*alcool/i,
    /concentrat(?:ie|ia)\s+alcoolic[aă][:\s]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1] || match.index == null) continue;
    const nearby = text.slice(Math.max(0, match.index - 20), match.index + 40);
    if (/%\s*(?:off|reducere|discount|soi|struguri)/i.test(nearby)) continue;
    const value = clampAlcohol(normalizeDecimal(match[1]) ?? NaN);
    if (value == null) continue;
    return {
      value,
      unit: "% vol",
      excerpt: excerptAround(text, match.index, match[0].length),
      ambiguous: false,
    };
  }
  return null;
}

export function parseResidualSugarClaim(text: string): ParsedTechNumber | null {
  if (/dulceata de|fructe dulci|dulceata placuta/i.test(text) && !/z[aă]har\s+rezidual/i.test(text)) {
    return null;
  }
  const patterns = [
    /z[aă]har\s+rezidual[:\s]+(\d+(?:[.,]\d+)?)\s*(?:g\s*\/\s*l|g\/l|g)/i,
    /residual\s+sugar[:\s]+(\d+(?:[.,]\d+)?)\s*(?:g\s*\/\s*l|g\/l)/i,
    /restzucker[:\s]+(\d+(?:[.,]\d+)?)\s*(?:g\s*\/\s*l|g\/l)/i,
    /(\d+(?:[.,]\d+)?)\s*g\s*\/\s*l\s*z[aă]har/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1] || match.index == null) continue;
    const value = clampGrams(normalizeDecimal(match[1]) ?? NaN, 250);
    if (value == null) continue;
    return {
      value,
      unit: "g/L",
      excerpt: excerptAround(text, match.index, match[0].length),
      ambiguous: false,
    };
  }
  return null;
}

export function parseTotalAcidityClaim(text: string): ParsedTechNumber | null {
  const folded = foldRomanianText(text);
  if (/\bph\b/.test(folded) && !/aciditate\s+total/i.test(text)) {
    const phOnly = text.match(/\bpH\s*[:=]?\s*(\d(?:[.,]\d{1,2})?)\b/i);
    if (phOnly && !/aciditate\s+total/i.test(text.slice(Math.max(0, (phOnly.index ?? 0) - 30), (phOnly.index ?? 0) + 40))) {
      return null;
    }
  }
  if (/aciditate\s+volatil/i.test(text) && !/aciditate\s+total/i.test(text)) {
    return null;
  }

  const labeled = text.match(
    /aciditate(?:\s+total[aă])?[:\s]+(\d+(?:[.,]\d+)?)\s*(g\s*\/\s*l|g\/l)/i,
  );
  if (labeled?.[1] && labeled.index != null) {
    const window = text.slice(Math.max(0, labeled.index - 40), labeled.index + labeled[0].length + 40);
    if (/aciditate\s+volatil|\bpH\b/i.test(window) && !/aciditate\s+total/i.test(window)) {
      return null;
    }
    const value = clampGrams(normalizeDecimal(labeled[1]) ?? NaN, 20);
    if (value != null) {
      return {
        value,
        unit: "g/L",
        excerpt: excerptAround(text, labeled.index, labeled[0].length),
        ambiguous: false,
      };
    }
  }

  const bare = text.match(/aciditate[:\s]+(\d+(?:[.,]\d+)?)(?!\s*(?:g\s*\/\s*l|g\/l))/i);
  if (bare?.[1] && bare.index != null) {
    return {
      value: normalizeDecimal(bare[1]) ?? 0,
      unit: null,
      excerpt: excerptAround(text, bare.index, bare[0].length),
      ambiguous: true,
    };
  }
  return null;
}

export function parseServingTemperatureClaim(text: string): {
  value: string;
  excerpt: string;
} | null {
  const match = text.match(
    /temperatura(?:\s+de\s+servire)?[:\s]+(\d{1,2}\s*[-/]\s*\d{1,2}\s*°?\s*c)/i,
  );
  if (!match?.[1] || match.index == null) return null;
  return {
    value: match[1].replace(/\s+/g, " ").trim(),
    excerpt: excerptAround(text, match.index, match[0].length),
  };
}

export function sourceContainsNumericClaim(sourceText: string, value: number): boolean {
  const folded = foldRomanianText(sourceText);
  const asDot = String(value);
  const asComma = asDot.replace(".", ",");
  const asInt = Number.isInteger(value) ? String(value) : null;
  return (
    folded.includes(foldRomanianText(asDot)) ||
    folded.includes(foldRomanianText(asComma)) ||
    (asInt != null && folded.includes(asInt))
  );
}
