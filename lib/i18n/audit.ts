import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import {
  COPY_CATEGORIES,
  type AuditEntry,
  type AuditOptions,
  type CopyCategory,
  type CopySurface,
  type PublicCopyAudit,
} from "./types";

const DEFAULT_SCAN_ROOTS = ["app", "components", "lib"] as const;
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/i;
const EXCLUDED_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  "__fixtures__",
  "__generated__",
  "__mocks__",
  "__tests__",
  "admin",
  "artifacts",
  "coverage",
  "fixtures",
  "generated",
  "migrations",
  "node_modules",
  "scripts",
  "test",
  "tests",
  "tmp",
]);
const INTERNAL_TOOL_FILE =
  /(?:^|[-_.])(audit|backfill|benchmark|cleanup|fixture|generate|import|migrate|migration|recover|recovery|seed|snapshot|train|verify)(?:[-_.]|$)/i;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const PUBLIC_JSX_ATTRIBUTES = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "caption",
  "content",
  "label",
  "placeholder",
  "title",
]);

const ROMANIAN_WORDS = new Set([
  "acasa",
  "acest",
  "aceasta",
  "aceste",
  "acum",
  "adauga",
  "afla",
  "alege",
  "alegem",
  "alegeri",
  "an",
  "ani",
  "apasa",
  "arata",
  "articol",
  "articole",
  "astazi",
  "avem",
  "bine",
  "bucatarie",
  "bucura",
  "bun",
  "buna",
  "cauta",
  "cautare",
  "cele",
  "celor",
  "citeste",
  "comanda",
  "compara",
  "cont",
  "crama",
  "crame",
  "cum",
  "cumpără",
  "cumpără".normalize("NFD").replace(/\p{M}/gu, ""),
  "cu",
  "de",
  "degustare",
  "din",
  "disponibil",
  "doar",
  "este",
  "fara",
  "gaseste",
  "ghid",
  "gust",
  "in",
  "inapoi",
  "intrebari",
  "iti",
  "la",
  "masa",
  "mancare",
  "mai",
  "mult",
  "nu",
  "ocazie",
  "pentru",
  "peste",
  "pivnita",
  "potrivit",
  "pret",
  "preturi",
  "producator",
  "recomandare",
  "recomandari",
  "regiune",
  "rezultate",
  "romanesc",
  "romaneasca",
  "romanesti",
  "salveaza",
  "scor",
  "selecteaza",
  "somelier",
  "sortare",
  "ta",
  "toate",
  "un",
  "unei",
  "vin",
  "vinul",
  "vinuri",
  "vinurile",
  "vezi",
]);

const SINGLE_WORD_COPY = new Set([
  "acasa",
  "adauga",
  "alege",
  "cauta",
  "comanda",
  "compara",
  "continua",
  "cumpara",
  "inapoi",
  "pret",
  "salveaza",
  "selecteaza",
  "vinuri",
]);

interface Candidate {
  readonly text: string;
  readonly node: ts.Node;
  readonly surface: CopySurface;
  readonly dynamic: boolean;
}

interface ScanCounters {
  candidateNodes: number;
  likelyRomanianNodes: number;
  excludedFiles: number;
}

function normalizeForLanguage(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("ro-RO");
}

function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function wordsIn(value: string): readonly string[] {
  return normalizeForLanguage(value).match(/\p{L}+/gu) ?? [];
}

export function isLikelyRomanianCopy(value: string): boolean {
  const text = normalizeCopy(value);
  if (
    text.length < 2 ||
    !/\p{L}/u.test(text) ||
    /^(?:https?:|mailto:|tel:|\/|#|[a-z]+:\/\/)/i.test(text) ||
    /^[\w./:@-]+$/u.test(text) && !/\s/u.test(text)
  ) {
    return SINGLE_WORD_COPY.has(normalizeForLanguage(text));
  }

  const words = wordsIn(text);
  if (words.length === 0) return false;

  const markerCount = words.filter((word) => ROMANIAN_WORDS.has(word)).length;
  const hasDiacritics = /[ăâîșşțţ]/iu.test(text);
  const romanianEndingCount = words.filter((word) =>
    /(?:ului|elor|ilor|este|easca|esc|uri|ita|ite|iti|are|ere)$/.test(word),
  ).length;

  if (words.length === 1) {
    return hasDiacritics || SINGLE_WORD_COPY.has(words[0] ?? "");
  }

  return (
    markerCount >= 2 ||
    markerCount >= 1 && (hasDiacritics || romanianEndingCount >= 1) ||
    hasDiacritics && romanianEndingCount >= 1
  );
}

function isExcludedRelativePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (segments.some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment.toLowerCase()))) {
    return true;
  }
  if (normalized.startsWith("lib/i18n/")) return true;

  const fileName = segments.at(-1) ?? "";
  return (
    TEST_FILE.test(fileName) ||
    /\.d\.[cm]?ts$/i.test(fileName) ||
    INTERNAL_TOOL_FILE.test(fileName)
  );
}

export function shouldExcludeAuditPath(relativePath: string): boolean {
  return isExcludedRelativePath(relativePath);
}

async function collectSourceFiles(
  rootDir: string,
  scanRoots: readonly string[],
  counters: ScanCounters,
): Promise<readonly string[]> {
  const files: string[] = [];

  async function walk(absoluteDirectory: string): Promise<void> {
    const children = await readdir(absoluteDirectory, {
      withFileTypes: true,
      encoding: "utf8",
    }).catch((error: unknown) => {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      if (code === "ENOENT") return [];
      throw error;
    });

    await Promise.all(
      children.map(async (child) => {
        const absolutePath = path.join(absoluteDirectory, child.name);
        const relativePath = path.relative(rootDir, absolutePath);
        if (isExcludedRelativePath(relativePath)) {
          counters.excludedFiles += 1;
          return;
        }
        if (child.isDirectory()) {
          await walk(absolutePath);
        } else if (child.isFile() && SOURCE_EXTENSION.test(child.name)) {
          files.push(absolutePath);
        }
      }),
    );
  }

  await Promise.all(
    scanRoots.map((scanRoot) => walk(path.resolve(rootDir, scanRoot))),
  );
  return files.sort((left, right) => left.localeCompare(right));
}

function scriptKindFor(filePath: string): ts.ScriptKind {
  if (/\.tsx$/i.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(filePath)) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/i.test(filePath)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function isModuleSpecifier(node: ts.StringLiteral): boolean {
  const parent = node.parent;
  return (
    (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
    parent.moduleSpecifier === node ||
    ts.isExternalModuleReference(parent) ||
    ts.isImportTypeNode(parent)
  );
}

function isNonCopyString(node: ts.StringLiteral): boolean {
  const parent = node.parent;
  if (isModuleSpecifier(node)) return true;
  if (ts.isExpressionStatement(parent) && parent.expression === node) return true;
  if (ts.isLiteralTypeNode(parent) || ts.isEnumMember(parent)) return true;
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isParameter(parent)) &&
    parent.name === node
  ) {
    return true;
  }
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) {
    return true;
  }
  if (ts.isJsxAttribute(parent)) return true;
  return false;
}

function templateText(node: ts.TemplateExpression): string {
  let value = node.head.text;
  for (const span of node.templateSpans) {
    value += "{{expression}}";
    value += span.literal.text;
  }
  return normalizeCopy(value);
}

function collectCandidates(sourceFile: ts.SourceFile): readonly Candidate[] {
  const candidates: Candidate[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      candidates.push({
        text: normalizeCopy(node.text),
        node,
        surface: "JSX_TEXT",
        dynamic: false,
      });
    } else if (ts.isJsxAttribute(node)) {
      const attributeName = node.name.getText(sourceFile).toLowerCase();
      if (
        PUBLIC_JSX_ATTRIBUTES.has(attributeName) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      ) {
        candidates.push({
          text: normalizeCopy(node.initializer.text),
          node: node.initializer,
          surface: "JSX_ATTRIBUTE",
          dynamic: false,
        });
      }
    } else if (ts.isTemplateExpression(node)) {
      candidates.push({
        text: templateText(node),
        node,
        surface: "TEMPLATE_TEXT",
        dynamic: true,
      });
    } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
      candidates.push({
        text: normalizeCopy(node.text),
        node,
        surface: "TEMPLATE_TEXT",
        dynamic: false,
      });
    } else if (ts.isStringLiteral(node) && !isNonCopyString(node)) {
      candidates.push({
        text: normalizeCopy(node.text),
        node,
        surface: "STRING_LITERAL",
        dynamic: false,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return candidates;
}

function contextFor(node: ts.Node, sourceFile: ts.SourceFile): string {
  const parts: string[] = [];
  let current: ts.Node | undefined = node;
  for (let depth = 0; current && depth < 7; depth += 1) {
    if (
      ts.isPropertyAssignment(current) ||
      ts.isPropertyDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isVariableDeclaration(current) ||
      ts.isJsxAttribute(current)
    ) {
      if (current.name) parts.push(current.name.getText(sourceFile));
    }
    if (ts.isCallExpression(current)) {
      parts.push(current.expression.getText(sourceFile));
    }
    current = current.parent;
  }
  return parts.join(" ").toLowerCase();
}

function looksLikeProperNoun(text: string, context: string): boolean {
  if (!/(?:name|nume|producer|producator|region|winery|crama|grape)/i.test(context)) {
    return false;
  }
  const words = text.match(/\p{L}+/gu) ?? [];
  return (
    words.length > 0 &&
    words.length <= 6 &&
    words.filter((word) => /^\p{Lu}/u.test(word)).length >=
      Math.ceil(words.length / 2)
  );
}

export function classifyCopy(
  text: string,
  context: string,
  relativePath: string,
  dynamic: boolean,
): CopyCategory {
  const haystack = `${relativePath} ${context} ${normalizeForLanguage(text)}`;
  if (/(?:^|[/\s_-])admin(?:[/\s_-]|$)|internal|dashboard|moderation/.test(haystack)) {
    return "INTERNAL_ADMIN";
  }
  if (/sommelier|somelier|chat|assistant|recomandare-ai/.test(haystack)) {
    return "SOMMELIER";
  }
  if (/metadata|generateMetadata|seo|open.?graph|twitter|json.?ld|schema|keywords?/.test(haystack)) {
    return "SEO";
  }
  if (/\bfaq\b|intrebar|question|answer/.test(haystack)) return "FAQ";
  if (/valid|invalid|required|obligator|constraint|schema\.parse/.test(haystack)) {
    return "VALIDATION";
  }
  if (/error|eroare|esuat|nereusit|not.?found|404|failed/.test(haystack)) {
    return "ERROR";
  }
  if (/price|pret|ron|lei|cost|buget/.test(haystack)) return "PRICE_COPY";
  if (/pairing|food|dish|mancare|asocier|potriv|culinar|masa/.test(haystack)) {
    return "PAIRING_COPY";
  }
  if (/score|scor|rating|punct/.test(haystack)) return "SCORE_COPY";
  if (/placeholder|label|formular|\bform\b|input|submit|trimite|camp/.test(haystack)) {
    return "FORM";
  }
  if (/editorial|journal|article|articol|author|review|degustar/.test(haystack)) {
    return "EDITORIAL";
  }
  if (looksLikeProperNoun(text, context)) return "PROPER_NOUN";
  return dynamic ? "DYNAMIC_TEMPLATE" : "STATIC_UI";
}

function emptyCategoryCounts(): Record<CopyCategory, number> {
  return Object.fromEntries(
    COPY_CATEGORIES.map((category) => [category, 0]),
  ) as Record<CopyCategory, number>;
}

function emptySurfaceCounts(): Record<CopySurface, number> {
  return {
    JSX_TEXT: 0,
    JSX_ATTRIBUTE: 0,
    STRING_LITERAL: 0,
    TEMPLATE_TEXT: 0,
  };
}

export async function auditPublicRomanianCopy(
  options: AuditOptions,
): Promise<PublicCopyAudit> {
  const rootDir = path.resolve(options.rootDir);
  const scanRoots = options.scanRoots ?? DEFAULT_SCAN_ROOTS;
  const counters: ScanCounters = {
    candidateNodes: 0,
    likelyRomanianNodes: 0,
    excludedFiles: 0,
  };
  const files = await collectSourceFiles(rootDir, scanRoots, counters);
  const entries: AuditEntry[] = [];
  const seen = new Set<string>();

  for (const filePath of files) {
    const sourceText = await readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(filePath),
    );
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");

    for (const candidate of collectCandidates(sourceFile)) {
      counters.candidateNodes += 1;
      const context = contextFor(candidate.node, sourceFile);
      const likelyRomanian = isLikelyRomanianCopy(candidate.text);
      const properNoun = looksLikeProperNoun(candidate.text, context);
      if (!likelyRomanian && !properNoun) continue;
      if (likelyRomanian) counters.likelyRomanianNodes += 1;

      const position = sourceFile.getLineAndCharacterOfPosition(
        candidate.node.getStart(sourceFile),
      );
      const category = classifyCopy(
        candidate.text,
        context,
        relativePath.toLowerCase(),
        candidate.dynamic,
      );
      const entry: AuditEntry = {
        text: candidate.text,
        file: relativePath,
        line: position.line + 1,
        column: position.character + 1,
        category,
        surface: candidate.surface,
      };
      const identity = [
        entry.file,
        entry.line,
        entry.column,
        entry.category,
        entry.surface,
        entry.text,
      ].join("\u0000");
      if (!seen.has(identity)) {
        seen.add(identity);
        entries.push(entry);
      }
    }
  }

  entries.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.text.localeCompare(right.text),
  );

  const byCategory = emptyCategoryCounts();
  const bySurface = emptySurfaceCounts();
  for (const entry of entries) {
    byCategory[entry.category] += 1;
    bySurface[entry.surface] += 1;
  }

  return {
    schemaVersion: 1,
    root: rootDir.replace(/\\/g, "/"),
    scanRoots: [...scanRoots],
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    readOnlyScan: true,
    summary: {
      scannedFiles: files.length,
      candidateNodes: counters.candidateNodes,
      likelyRomanianNodes: counters.likelyRomanianNodes,
      uniqueEntries: entries.length,
      excludedFiles: counters.excludedFiles,
      byCategory,
      bySurface,
    },
    entries,
  };
}
