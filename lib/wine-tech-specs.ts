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

function normalizeDecimal(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function clampAlcohol(value: number): number | null {
  if (value < 8 || value > 18) return null;
  return Math.round(value * 10) / 10;
}

function clampGramPerLiter(value: number, max = 300): number | null {
  if (value < 0 || value > max) return null;
  return Math.round(value * 10) / 10;
}

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
  const patterns = [
    /vol\.?\s*alc\.?[:\s]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
    /concentrat(?:ie|ia)\s+alcoolic[aă][:\s]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
    /alcool[:\s]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
    /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*vol\.?/i,
    /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*alcool/i,
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match?.[1]) {
      const value = normalizeDecimal(match[1]);
      if (value != null) {
        const clamped = clampAlcohol(value);
        if (clamped != null) return clamped;
      }
    }
  }

  return null;
}

export function parseSugarFromText(pageText: string): number | null {
  const patterns = [
    /z[aă]har\s+rezidual[:\s]+(\d+(?:[.,]\d+)?)\s*g/i,
    /(\d+(?:[.,]\d+)?)\s*g\s*\/\s*l\s*z[aă]har/i,
    /(\d+(?:[.,]\d+)?)\s*g\/l\s*z[aă]har/i,
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match?.[1]) {
      const value = normalizeDecimal(match[1]);
      if (value != null) {
        const clamped = clampGramPerLiter(value, 250);
        if (clamped != null) return clamped;
      }
    }
  }

  return null;
}

export function parseAcidityFromText(pageText: string): number | null {
  const patterns = [
    /aciditate[:\s]+(\d+(?:[.,]\d+)?)\s*g\s*\/?\s*l?/i,
    /(\d+(?:[.,]\d+)?)\s*g\s*\/\s*l\s*aciditate/i,
    /(\d+(?:[.,]\d+)?)\s*g\/l\s*aciditate/i,
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match?.[1]) {
      const value = normalizeDecimal(match[1]);
      if (value != null) {
        const clamped = clampGramPerLiter(value, 20);
        if (clamped != null) return clamped;
      }
    }
  }

  return null;
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

function pick<T>(aiValue: T | null | undefined, ruleValue: T | null): T | null {
  if (aiValue !== null && aiValue !== undefined) return aiValue;
  return ruleValue;
}

/** Merge AI extraction with deterministic page parsing. */
export function resolveTechSpecs(input: ResolveTechSpecsInput): WineTechSpecs {
  const fromPage = extractTechSpecsFromPage(input.wineName, input.pageText);

  return {
    sweetness: pick(input.ai?.sweetness, fromPage.sweetness),
    alcohol: pick(input.ai?.alcohol, fromPage.alcohol),
    sugar: pick(input.ai?.sugar, fromPage.sugar),
    acidity: pick(input.ai?.acidity, fromPage.acidity),
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
