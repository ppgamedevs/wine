import type { ContentTranslationJson } from "@/lib/schema";

export interface TranslationIdentityGuard {
  wineNames?: readonly string[];
  wineryNames?: readonly string[];
  grapeNames?: readonly string[];
  protectedTerms?: readonly string[];
}

export interface TranslationQaIssue {
  code:
    | "EMPTY_TRANSLATION"
    | "STRUCTURE_CHANGED"
    | "NUMBER_CHANGED"
    | "URL_CHANGED"
    | "IDENTITY_CHANGED"
    | "MARKDOWN_FENCE_CHANGED";
  detail: string;
}

export interface TranslationQaReport {
  valid: boolean;
  issues: TranslationQaIssue[];
}

function isRecord(
  value: ContentTranslationJson,
): value is { [key: string]: ContentTranslationJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectTextLeaves(
  value: ContentTranslationJson,
  path = "$",
): Array<{ path: string; text: string }> {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectTextLeaves(item, `${path}[${index}]`),
    );
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      collectTextLeaves(item, `${path}.${key}`),
    );
  }
  return [];
}

function structureSignature(value: ContentTranslationJson): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map(structureSignature).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${structureSignature(value[key]!)}`)
      .join(",")}}`;
  }
  return typeof value;
}

function sortedMatches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)]
    .map((match) => match[0])
    .sort((left, right) => left.localeCompare(right));
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function normalizeNumericToken(token: string): string {
  const percent = token.endsWith("%") ? "%" : "";
  const numeric = token.replace(/%$/u, "").replace(",", ".");
  return `${Number(numeric).toString()}${percent}`;
}

function countMarkdownFences(text: string): number {
  return sortedMatches(text, /```/g).length;
}

export function validateTranslation(
  source: ContentTranslationJson,
  translated: ContentTranslationJson,
  guard: TranslationIdentityGuard = {},
): TranslationQaReport {
  const issues: TranslationQaIssue[] = [];
  if (structureSignature(source) !== structureSignature(translated)) {
    issues.push({
      code: "STRUCTURE_CHANGED",
      detail: "Translated JSON does not preserve the source shape.",
    });
  }

  const sourceLeaves = collectTextLeaves(source);
  const translatedLeaves = collectTextLeaves(translated);
  const translatedByPath = new Map(
    translatedLeaves.map((entry) => [entry.path, entry.text]),
  );
  const protectedTerms = [
    ...(guard.wineNames ?? []),
    ...(guard.wineryNames ?? []),
    ...(guard.grapeNames ?? []),
    ...(guard.protectedTerms ?? []),
  ].filter((term) => term.trim().length > 0);

  for (const sourceLeaf of sourceLeaves) {
    const translatedText = translatedByPath.get(sourceLeaf.path);
    if (translatedText == null || translatedText.trim().length === 0) {
      issues.push({
        code: "EMPTY_TRANSLATION",
        detail: `${sourceLeaf.path}: translated text is empty.`,
      });
      continue;
    }

    const sourceNumbers = sortedMatches(
      sourceLeaf.text,
      /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?%?(?![\p{L}\p{N}])/gu,
    );
    const translatedNumbers = sortedMatches(
      translatedText,
      /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?%?(?![\p{L}\p{N}])/gu,
    );
    if (
      !sameValues(
        sourceNumbers.map(normalizeNumericToken),
        translatedNumbers.map(normalizeNumericToken),
      )
    ) {
      issues.push({
        code: "NUMBER_CHANGED",
        detail: `${sourceLeaf.path}: numeric tokens changed.`,
      });
    }

    const sourceUrls = sortedMatches(sourceLeaf.text, /https?:\/\/[^\s)]+/gu);
    const translatedUrls = sortedMatches(translatedText, /https?:\/\/[^\s)]+/gu);
    if (!sameValues(sourceUrls, translatedUrls)) {
      issues.push({
        code: "URL_CHANGED",
        detail: `${sourceLeaf.path}: URLs changed.`,
      });
    }

    for (const term of protectedTerms) {
      if (sourceLeaf.text.includes(term) && !translatedText.includes(term)) {
        issues.push({
          code: "IDENTITY_CHANGED",
          detail: `${sourceLeaf.path}: protected identity "${term}" changed.`,
        });
      }
    }

    if (
      countMarkdownFences(sourceLeaf.text) !==
      countMarkdownFences(translatedText)
    ) {
      issues.push({
        code: "MARKDOWN_FENCE_CHANGED",
        detail: `${sourceLeaf.path}: Markdown code fences changed.`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

