export const COPY_CATEGORIES = [
  "STATIC_UI",
  "DYNAMIC_TEMPLATE",
  "SEO",
  "FAQ",
  "ERROR",
  "VALIDATION",
  "FORM",
  "SCORE_COPY",
  "PRICE_COPY",
  "PAIRING_COPY",
  "SOMMELIER",
  "EDITORIAL",
  "INTERNAL_ADMIN",
  "PROPER_NOUN",
] as const;

export type CopyCategory = (typeof COPY_CATEGORIES)[number];

export type CopySurface =
  | "JSX_TEXT"
  | "JSX_ATTRIBUTE"
  | "STRING_LITERAL"
  | "TEMPLATE_TEXT";

export interface AuditEntry {
  readonly text: string;
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly category: CopyCategory;
  readonly surface: CopySurface;
}

export interface AuditSummary {
  readonly scannedFiles: number;
  readonly candidateNodes: number;
  readonly likelyRomanianNodes: number;
  readonly uniqueEntries: number;
  readonly excludedFiles: number;
  readonly byCategory: Readonly<Record<CopyCategory, number>>;
  readonly bySurface: Readonly<Record<CopySurface, number>>;
}

export interface PublicCopyAudit {
  readonly schemaVersion: 1;
  readonly root: string;
  readonly scanRoots: readonly string[];
  readonly generatedAt: string;
  readonly readOnlyScan: true;
  readonly summary: AuditSummary;
  readonly entries: readonly AuditEntry[];
}

export interface AuditOptions {
  readonly rootDir: string;
  readonly scanRoots?: readonly string[];
  readonly generatedAt?: string;
}

export interface AuditArtifactPaths {
  readonly jsonPath: string;
  readonly markdownPath: string;
}
