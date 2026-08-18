/**
 * Source-only sweetness. Never consult the database wine name.
 */
export type SourceSweetnessLevel = "sec" | "demisec" | "demidulce" | "dulce";

interface SweetnessPattern {
  value: SourceSweetnessLevel;
  pattern: RegExp;
  labeled: boolean;
}

const PATTERNS: SweetnessPattern[] = [
  { value: "demidulce", pattern: /\b(?:clasificare|tip|tip vin|vin)[:\s]+demi[\s-]?dulce\b/i, labeled: true },
  { value: "demisec", pattern: /\b(?:clasificare|tip|tip vin|vin)[:\s]+demi[\s-]?sec\b/i, labeled: true },
  { value: "dulce", pattern: /\b(?:clasificare|tip|tip vin)[:\s]+dulce\b/i, labeled: true },
  { value: "dulce", pattern: /\bvin\s+(?:alb|rosu|roze|rose)?\s*dulce\b/i, labeled: true },
  { value: "sec", pattern: /\b(?:clasificare|tip|tip vin)[:\s]+sec\b/i, labeled: true },
  { value: "sec", pattern: /\bvin\s+(?:alb|rosu|roze|rose)\s+sec\b/i, labeled: true },
  { value: "demidulce", pattern: /\bdemi[\s-]?dulce\b/i, labeled: false },
  { value: "demisec", pattern: /\bdemi[\s-]?sec\b/i, labeled: false },
  { value: "sec", pattern: /\bsec\b(?=\s*[,.]|$|\s+\d)/i, labeled: false },
];

export function parseSweetnessClaimFromSource(
  sourceText: string,
): { value: SourceSweetnessLevel; excerpt: string } | null {
  const text = sourceText.trim();
  if (!text) return null;

  for (const item of PATTERNS.filter((row) => row.labeled)) {
    const match = text.match(item.pattern);
    if (match?.[0]) return { value: item.value, excerpt: match[0] };
  }

  const specific = PATTERNS.filter((row) => !row.labeled && row.value !== "sec");
  for (const item of specific) {
    const match = text.match(item.pattern);
    if (match?.[0]) return { value: item.value, excerpt: match[0] };
  }

  return null;
}
