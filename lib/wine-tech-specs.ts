import {
  parseAlcoholClaim,
  parseResidualSugarClaim,
  parseTotalAcidityClaim,
  sourceContainsNumericClaim,
} from "@/lib/tech-facts/parse";

export type WineSweetnessLevel = "sec" | "demisec" | "demidulce" | "dulce";

export interface WineTechSpecs {
  sweetness: WineSweetnessLevel | null;
  alcohol: number | null;
  sugar: number | null;
  acidity: number | null;
}

interface ResolveTechSpecsInput {
  wineName: string;
  pageText: string;
  ai?: Partial<WineTechSpecs>;
}

const SWEETNESS_LEVELS: WineSweetnessLevel[] = [
  "demidulce",
  "demisec",
  "dulce",
  "sec",
];

/** Infer sweetness from wine name or page copy (Romanian retail labels). */
export function parseSweetnessFromText(
  wineName: string,
  pageText = "",
): WineSweetnessLevel | null {
  const haystack = `${wineName} ${pageText}`.toLowerCase();

  for (const level of SWEETNESS_LEVELS) {
    const patterns: RegExp[] =
      level === "sec"
        ? [
            /\bclasificare[:\s]+sec\b/i,
            /\bvin\s+sec\b/,
            /\brose\s+sec\b/,
            /\broze\s+sec\b/,
            /\brosu\s+sec\b/,
            /\balb\s+sec\b/,
            /\bsec\b(?=\s*[,.]|$|\s+\d|\s+0[,.]\d)/,
            /\bsec\b(?=\s*[,/|-])/,
          ]
        : level === "demisec"
          ? [/\bdemi[\s-]?sec\b/, /\bdemisec\b/]
          : level === "demidulce"
            ? [/\bdemi[\s-]?dulce\b/, /\bdemidulce\b/, /\bsemi[\s-]?dulce\b/]
            : [/\bdulce\b/, /\bsweet\b/];

    if (patterns.some((pattern) => pattern.test(haystack))) {
      return level;
    }
  }

  return null;
}

export function parseAlcoholFromText(pageText: string): number | null {
  return parseAlcoholClaim(pageText)?.value ?? null;
}

export function parseSugarFromText(pageText: string): number | null {
  const parsed = parseResidualSugarClaim(pageText);
  if (!parsed || parsed.ambiguous) return null;
  return parsed.value;
}

export function parseAcidityFromText(pageText: string): number | null {
  const parsed = parseTotalAcidityClaim(pageText);
  if (!parsed || parsed.ambiguous || parsed.unit !== "g/L") return null;
  return parsed.value;
}

export function extractTechSpecsFromPage(
  wineName: string,
  pageText: string,
): WineTechSpecs {
  return {
    sweetness: parseSweetnessFromText(wineName, pageText),
    alcohol: parseAlcoholFromText(pageText),
    sugar: parseSugarFromText(pageText),
    acidity: parseAcidityFromText(pageText),
  };
}

function aiNumberIfQuoted(
  pageText: string,
  value: number | null | undefined,
  label: string,
): number | null {
  if (value == null) return null;
  if (!sourceContainsNumericClaim(pageText, value)) return null;
  if (!new RegExp(label, "i").test(pageText)) return null;
  return value;
}

/**
 * Single-source resolution. Deterministic parse wins.
 * AI may only survive when the numeric token exists in this source text.
 */
export function resolveTechSpecs(input: ResolveTechSpecsInput): WineTechSpecs {
  const fromPage = extractTechSpecsFromPage(input.wineName, input.pageText);
  const fromName = parseSweetnessFromText(input.wineName, "");

  return {
    sweetness: fromName ?? fromPage.sweetness ?? input.ai?.sweetness ?? null,
    alcohol: fromPage.alcohol ?? aiNumberIfQuoted(input.pageText, input.ai?.alcohol, "alcool"),
    sugar: fromPage.sugar ?? aiNumberIfQuoted(input.pageText, input.ai?.sugar, "zahar"),
    acidity: fromPage.acidity ?? aiNumberIfQuoted(input.pageText, input.ai?.acidity, "aciditate"),
  };
}

export function techSpecsForDb(specs: WineTechSpecs): {
  sweetness?: WineSweetnessLevel;
  alcohol?: number;
  sugar?: number;
  acidity?: number;
} {
  return {
    ...(specs.sweetness ? { sweetness: specs.sweetness } : {}),
    ...(specs.alcohol != null ? { alcohol: specs.alcohol } : {}),
    ...(specs.sugar != null ? { sugar: specs.sugar } : {}),
    ...(specs.acidity != null ? { acidity: specs.acidity } : {}),
  };
}
