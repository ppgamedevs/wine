const EM_DASH = "\u2014";
const EN_DASH = "\u2013";

const PROVENANCE_MARKER = "Scoruri VinIntel:";

/** Normalize AI punctuation for readable Romanian copy. */
export function sanitizeEditorialText(text: string | null | undefined): string {
  if (!text?.trim()) return "";

  return text
    .replace(new RegExp(`\\s*${EM_DASH}\\s*`, "g"), ", ")
    .replace(new RegExp(`\\s*${EN_DASH}\\s*`, "g"), ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .trim();
}

export interface ParsedValueExplanation {
  summary: string;
  provenanceLines: string[];
}

export function splitValueExplanation(
  raw: string | null | undefined,
): ParsedValueExplanation {
  const text = raw?.trim() ?? "";
  if (!text) {
    return { summary: "", provenanceLines: [] };
  }

  const markerIndex = text.indexOf(PROVENANCE_MARKER);
  if (markerIndex === -1) {
    return {
      summary: sanitizeEditorialText(text),
      provenanceLines: [],
    };
  }

  const summary = sanitizeEditorialText(text.slice(0, markerIndex));
  const provenanceBlock = text.slice(markerIndex + PROVENANCE_MARKER.length);
  const provenanceLines = provenanceBlock
    .split(/\s+-\s+(?=Value:|Gift:|Food Match:|Versatilitate la masa:)|\n/)
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  return { summary, provenanceLines };
}
