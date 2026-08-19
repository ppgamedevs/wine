import "../lib/load-env";

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { contentTranslations } from "../lib/schema";
import { collectTranslationSources } from "../lib/i18n/content-sources";
import { hashContentTranslationSource } from "../lib/i18n/content-translations";

type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null;

interface CoverageAuditReport {
  generatedAt: string;
  messageKeys: {
    romanian: number;
    english: number;
    missingInEnglish: string[];
    extraInEnglish: string[];
  };
  dynamic: {
    sources: number;
    ready: number;
    stale: number;
    reviewRequired: number;
    failed: number;
    missing: number;
    byEntityType: Record<string, { sources: number; ready: number }>;
  };
  englishIndexingEnabled: boolean;
  indexingGateSafe: boolean;
  pass: boolean;
}

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenKeys(value: JsonValue, prefix = ""): string[] {
  if (!isObject(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

async function readJson(path: string): Promise<JsonObject> {
  return JSON.parse(await readFile(path, "utf8")) as JsonObject;
}

async function loadLocaleMessages(locale: "ro" | "en"): Promise<JsonObject> {
  const root = await readJson(resolve("messages", `${locale}.json`));
  const fragmentDirectory = resolve("messages", locale);
  let fragmentFiles: string[] = [];
  try {
    fragmentFiles = (await readdir(fragmentDirectory))
      .filter((file) => file.endsWith(".json"))
      .sort();
  } catch {
    return root;
  }
  const fragments = await Promise.all(
    fragmentFiles.map((file) => readJson(resolve(fragmentDirectory, file))),
  );
  return Object.assign({}, root, ...fragments);
}

function sourceIdentity(source: {
  entityType: string;
  entityId: string;
  field: string;
  sourceLocale: string;
  targetLocale: string;
}): string {
  return [
    source.entityType,
    source.entityId,
    source.field,
    source.sourceLocale,
    source.targetLocale,
  ].join("|");
}

async function main(): Promise<void> {
  const [romanianMessages, englishMessages, sources] = await Promise.all([
    loadLocaleMessages("ro"),
    loadLocaleMessages("en"),
    collectTranslationSources(),
  ]);
  const romanianKeys = new Set(flattenKeys(romanianMessages));
  const englishKeys = new Set(flattenKeys(englishMessages));
  const missingInEnglish = [...romanianKeys].filter(
    (key) => !englishKeys.has(key),
  );
  const extraInEnglish = [...englishKeys].filter(
    (key) => !romanianKeys.has(key),
  );
  let rows: Array<typeof contentTranslations.$inferSelect> = [];
  try {
    rows = await db
      .select()
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.targetLocale, "en"),
          eq(contentTranslations.isCurrent, true),
        ),
      );
  } catch {
    rows = [];
  }
  const rowsByIdentity = new Map(
    rows.map((row) => [sourceIdentity(row), row]),
  );
  const dynamic = {
    sources: sources.length,
    ready: 0,
    stale: 0,
    reviewRequired: 0,
    failed: 0,
    missing: 0,
    byEntityType: {} as Record<string, { sources: number; ready: number }>,
  };
  for (const candidate of sources) {
    const bucket = (dynamic.byEntityType[candidate.entityType] ??= {
      sources: 0,
      ready: 0,
    });
    bucket.sources += 1;
    const row = rowsByIdentity.get(sourceIdentity(candidate));
    if (!row) {
      dynamic.missing += 1;
      continue;
    }
    const sourceHash = hashContentTranslationSource(candidate);
    if (row.sourceHash !== sourceHash || row.status === "STALE") {
      dynamic.stale += 1;
    } else if (row.status === "READY") {
      dynamic.ready += 1;
      bucket.ready += 1;
    } else if (row.status === "REVIEW_REQUIRED") {
      dynamic.reviewRequired += 1;
    } else {
      dynamic.failed += 1;
    }
  }
  const englishIndexingEnabled =
    process.env.ENGLISH_INDEXING_ENABLED === "true";
  const complete =
    missingInEnglish.length === 0 &&
    extraInEnglish.length === 0 &&
    dynamic.ready === dynamic.sources;
  const report: CoverageAuditReport = {
    generatedAt: new Date().toISOString(),
    messageKeys: {
      romanian: romanianKeys.size,
      english: englishKeys.size,
      missingInEnglish,
      extraInEnglish,
    },
    dynamic,
    englishIndexingEnabled,
    indexingGateSafe: !englishIndexingEnabled || complete,
    pass: complete,
  };
  await mkdir(resolve("artifacts"), { recursive: true });
  await writeFile(
    resolve("artifacts", "i18n-coverage-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass || !report.indexingGateSafe) process.exitCode = 2;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

