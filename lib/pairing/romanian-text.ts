/**
 * One Romanian text normalizer for search, taxonomy, and dish identity.
 * Display stays accented. Matching is accent-insensitive.
 */
const CEDILLA_TO_COMMA: Record<string, string> = {
  "\u015F": "\u0219",
  "\u015E": "\u0218",
  "\u0163": "\u021B",
  "\u0162": "\u021A",
};

export function canonicalizeRomanianLetters(value: string): string {
  return value.replace(/[\u015F\u015E\u0163\u0162]/g, (char) => CEDILLA_TO_COMMA[char] ?? char);
}

export function foldRomanianText(value: string): string {
  return canonicalizeRomanianLetters(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function foldRomanianWords(value: string): string[] {
  return foldRomanianText(value).split(" ").filter(Boolean);
}

export function romanianTextEquals(left: string, right: string): boolean {
  return foldRomanianText(left) === foldRomanianText(right);
}

export function romanianTextIncludes(haystack: string, needle: string): boolean {
  const foldedHay = foldRomanianText(haystack);
  const foldedNeedle = foldRomanianText(needle);
  if (!foldedHay || !foldedNeedle) return false;
  return (` ${foldedHay} `).includes(` ${foldedNeedle} `);
}
