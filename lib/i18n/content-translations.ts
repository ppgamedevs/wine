import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentTranslations,
  type ContentTranslationEntityType,
  type ContentTranslationJson,
  type ContentTranslationQaMetadata,
  type ContentTranslationStatus,
} from "@/lib/schema";

export interface ContentTranslationIdentity {
  entityType: ContentTranslationEntityType;
  entityId: string;
  field: string;
  sourceLocale?: string;
  targetLocale: string;
}

export interface ContentTranslationSource extends ContentTranslationIdentity {
  sourceValueJson: ContentTranslationJson;
  /**
   * Useful to callers for cache invalidation, but deliberately excluded from
   * the hash. Source content, not collection time, defines translation staleness.
   */
  sourceUpdatedAt?: string | null;
}

export interface TranslationQaResult {
  valid: boolean;
  issues: string[];
}

export type ContentTranslationReadiness = ContentTranslationStatus;

export type ContentTranslationRow = typeof contentTranslations.$inferSelect;

export interface ContentTranslationAssessment {
  readiness: ContentTranslationReadiness;
  currentSourceHash: string;
  qa: TranslationQaResult;
}

function isJsonObject(
  value: ContentTranslationJson,
): value is { [key: string]: ContentTranslationJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableJson(value: ContentTranslationJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key]!)}`)
    .join(",")}}`;
}

/**
 * Hashes only the source locale and source JSON. Entity identity, target locale,
 * and operational timestamps cannot make unchanged Romanian content stale.
 */
export function hashContentTranslationSource(
  source: ContentTranslationSource,
): string {
  const hashInput: ContentTranslationJson = {
    sourceLocale: source.sourceLocale ?? "ro",
    sourceValueJson: source.sourceValueJson,
  };
  return createHash("sha256").update(stableJson(hashInput)).digest("hex");
}

function jsonKind(value: ContentTranslationJson): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function collectShapeIssues(
  source: ContentTranslationJson,
  translated: ContentTranslationJson,
  path: string,
  issues: string[],
): void {
  const sourceKind = jsonKind(source);
  const translatedKind = jsonKind(translated);
  if (sourceKind !== translatedKind) {
    issues.push(`${path}: expected ${sourceKind}, received ${translatedKind}`);
    return;
  }

  if (typeof source === "string" && typeof translated === "string") {
    if (source.length > 0 && translated.trim().length === 0) {
      issues.push(`${path}: translated string is empty`);
    }
    return;
  }

  if (
    source === null ||
    typeof source === "number" ||
    typeof source === "boolean"
  ) {
    if (source !== translated) {
      issues.push(`${path}: non-text value changed`);
    }
    return;
  }

  if (Array.isArray(source) && Array.isArray(translated)) {
    if (source.length !== translated.length) {
      issues.push(
        `${path}: expected ${source.length} items, received ${translated.length}`,
      );
      return;
    }
    source.forEach((item, index) => {
      collectShapeIssues(item, translated[index]!, `${path}[${index}]`, issues);
    });
    return;
  }

  if (isJsonObject(source) && isJsonObject(translated)) {
    const sourceKeys = Object.keys(source).sort();
    const translatedKeys = Object.keys(translated).sort();
    if (sourceKeys.join("\u0000") !== translatedKeys.join("\u0000")) {
      issues.push(`${path}: object keys differ`);
      return;
    }
    for (const key of sourceKeys) {
      collectShapeIssues(
        source[key]!,
        translated[key]!,
        `${path}.${key}`,
        issues,
      );
    }
  }
}

/**
 * Pure structural QA. It verifies that translation changes only text leaves.
 */
export function checkContentTranslationShape(
  source: ContentTranslationJson,
  translated: ContentTranslationJson | null,
): TranslationQaResult {
  if (translated === null) {
    return { valid: false, issues: ["$: translation is missing"] };
  }

  const issues: string[] = [];
  collectShapeIssues(source, translated, "$", issues);
  return { valid: issues.length === 0, issues };
}

function metadataRequiresReview(
  metadata: ContentTranslationQaMetadata,
): boolean {
  return (
    metadata.shapeValid === false ||
    (metadata.issues?.length ?? 0) > 0
  );
}

export function assessContentTranslationReadiness(
  row: Pick<
    ContentTranslationRow,
    "sourceHash" | "status" | "sourceValueJson" | "valueJson" | "qaMetadata"
  >,
  source: ContentTranslationSource,
): ContentTranslationAssessment {
  const currentSourceHash = hashContentTranslationSource(source);
  const qa = checkContentTranslationShape(
    row.sourceValueJson,
    row.valueJson,
  );

  if (row.sourceHash !== currentSourceHash || row.status === "STALE") {
    return { readiness: "STALE", currentSourceHash, qa };
  }
  if (row.status === "FAILED") {
    return { readiness: "FAILED", currentSourceHash, qa };
  }
  if (
    row.status === "REVIEW_REQUIRED" ||
    !qa.valid ||
    metadataRequiresReview(row.qaMetadata)
  ) {
    return { readiness: "REVIEW_REQUIRED", currentSourceHash, qa };
  }
  return { readiness: "READY", currentSourceHash, qa };
}

export async function getCurrentContentTranslation(
  identity: ContentTranslationIdentity,
): Promise<ContentTranslationRow | null> {
  const [row] = await db
    .select()
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.entityType, identity.entityType),
        eq(contentTranslations.entityId, identity.entityId),
        eq(contentTranslations.field, identity.field),
        eq(contentTranslations.sourceLocale, identity.sourceLocale ?? "ro"),
        eq(contentTranslations.targetLocale, identity.targetLocale),
        eq(contentTranslations.isCurrent, true),
      ),
    )
    .orderBy(desc(contentTranslations.id))
    .limit(1);
  return row ?? null;
}

export async function getReadyContentTranslation(
  source: ContentTranslationSource,
): Promise<ContentTranslationRow | null> {
  let row: ContentTranslationRow | null;
  try {
    row = await getCurrentContentTranslation(source);
  } catch {
    return null;
  }
  if (row === null) return null;
  const assessment = assessContentTranslationReadiness(row, source);
  return assessment.readiness === "READY" ? row : null;
}

export async function getReadyTranslationValue(
  source: ContentTranslationSource,
): Promise<ContentTranslationJson | null> {
  const row = await getReadyContentTranslation(source);
  return row?.valueJson ?? null;
}

export async function translationCoverageReady(
  sources: readonly ContentTranslationSource[],
): Promise<boolean> {
  if (sources.length === 0) return true;
  const rows = await Promise.all(
    sources.map((source) => getReadyContentTranslation(source)),
  );
  return rows.every((row) => row !== null);
}

export async function translationCoverageByEntity(
  sources: readonly ContentTranslationSource[],
): Promise<Map<string, boolean>> {
  const sourceGroups = new Map<string, ContentTranslationSource[]>();
  for (const source of sources) {
    const key = `${source.entityType}|${source.entityId}`;
    const group = sourceGroups.get(key) ?? [];
    group.push(source);
    sourceGroups.set(key, group);
  }
  if (sources.length === 0) return new Map();

  let rows: ContentTranslationRow[];
  try {
    rows = await db
      .select()
      .from(contentTranslations)
      .where(eq(contentTranslations.isCurrent, true));
  } catch {
    return new Map(
      [...sourceGroups.keys()].map((key) => [key, false] as const),
    );
  }
  const rowsByIdentity = new Map(
    rows.map((row) => [
      [
        row.entityType,
        row.entityId,
        row.field,
        row.sourceLocale,
        row.targetLocale,
      ].join("|"),
      row,
    ]),
  );
  const result = new Map<string, boolean>();
  for (const [entityKey, group] of sourceGroups) {
    const ready = group.every((source) => {
      const identity = [
        source.entityType,
        source.entityId,
        source.field,
        source.sourceLocale ?? "ro",
        source.targetLocale,
      ].join("|");
      const row = rowsByIdentity.get(identity);
      return (
        row != null &&
        assessContentTranslationReadiness(row, source).readiness === "READY"
      );
    });
    result.set(entityKey, ready);
  }
  return result;
}
