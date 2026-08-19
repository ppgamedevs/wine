import "../lib/load-env";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  contentTranslations,
  type ContentTranslationEntityType,
} from "../lib/schema";
import {
  hashContentTranslationSource,
  type ContentTranslationSource,
} from "../lib/i18n/content-translations";
import {
  collectTranslationSources,
  type TranslationSourceCandidate,
} from "../lib/i18n/content-sources";
import {
  TRANSLATION_PROMPT_VERSION,
  assertXaiTranslationConfig,
  translateContentWithXai,
} from "../lib/i18n/translation-model";
import { validateTranslation } from "../lib/i18n/translation-qa";

interface CliOptions {
  locale: "en";
  apply: boolean;
  retry: boolean;
  limit: number | null;
}

interface TranslationRunReport {
  generatedAt: string;
  locale: "en";
  apply: boolean;
  model: string;
  sourceCount: number;
  missing: number;
  stale: number;
  readyReused: number;
  reviewRequired: number;
  failed: number;
  apiCalls: number;
  writes: number;
  skippedExistingNonReady: number;
  failures: Array<{
    entityType: string;
    entityId: string;
    field: string;
    reason: string;
  }>;
}

const MAX_TRANSLATION_ATTEMPTS = 3;

async function translateWithRetry(
  input: Parameters<typeof translateContentWithXai>[0],
  onAttempt: () => void,
): Promise<Awaited<ReturnType<typeof translateContentWithXai>>> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TRANSLATION_ATTEMPTS; attempt += 1) {
    try {
      onAttempt();
      return await translateContentWithXai(input);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_TRANSLATION_ATTEMPTS) {
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, 500 * 2 ** (attempt - 1)),
        );
      }
    }
  }
  throw lastError;
}

function parseOptions(argv: readonly string[]): CliOptions {
  const localeArg = argv.find((arg) => arg.startsWith("--locale="));
  const locale = localeArg?.slice("--locale=".length) ?? "en";
  if (locale !== "en") {
    throw new Error("Prompt 27B currently supports only --locale=en.");
  }
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const parsedLimit = limitArg
    ? Number.parseInt(limitArg.slice("--limit=".length), 10)
    : null;
  if (parsedLimit != null && (!Number.isInteger(parsedLimit) || parsedLimit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  return {
    locale,
    apply: argv.includes("--apply"),
    retry: argv.includes("--retry"),
    limit: parsedLimit,
  };
}

function identityKey(input: {
  entityType: string;
  entityId: string;
  field: string;
  sourceLocale?: string;
  targetLocale: string;
}): string {
  return [
    input.entityType,
    input.entityId,
    input.field,
    input.sourceLocale ?? "ro",
    input.targetLocale,
  ].join("|");
}

function toTranslationSource(
  source: TranslationSourceCandidate,
): ContentTranslationSource {
  return {
    entityType: source.entityType as ContentTranslationEntityType,
    entityId: source.entityId,
    field: source.field,
    sourceLocale: source.sourceLocale,
    targetLocale: source.targetLocale,
    sourceValueJson: source.sourceValueJson,
    sourceUpdatedAt: source.sourceUpdatedAt,
  };
}

async function writeReport(report: TranslationRunReport): Promise<void> {
  const artifactDir = resolve("artifacts");
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    resolve(artifactDir, `i18n-translation-${report.locale}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const configuredModel = options.apply
    ? assertXaiTranslationConfig()
    : process.env.I18N_TRANSLATION_MODEL?.trim() || "NOT_CONFIGURED";
  const allSources = await collectTranslationSources();
  const sources =
    options.limit == null ? allSources : allSources.slice(0, options.limit);
  let existingRows: Array<typeof contentTranslations.$inferSelect> = [];
  try {
    existingRows = await db
      .select()
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.targetLocale, options.locale),
          eq(contentTranslations.isCurrent, true),
        ),
      );
  } catch (error) {
    if (options.apply) throw error;
  }
  const existingByIdentity = new Map(
    existingRows.map((row) => [identityKey(row), row]),
  );
  const report: TranslationRunReport = {
    generatedAt: new Date().toISOString(),
    locale: options.locale,
    apply: options.apply,
    model: configuredModel,
    sourceCount: sources.length,
    missing: 0,
    stale: 0,
    readyReused: 0,
    reviewRequired: 0,
    failed: 0,
    apiCalls: 0,
    writes: 0,
    skippedExistingNonReady: 0,
    failures: [],
  };

  for (const sourceCandidate of sources) {
    const source = toTranslationSource(sourceCandidate);
    const sourceHash = hashContentTranslationSource(source);
    const key = identityKey(source);
    const existing = existingByIdentity.get(key);
    if (existing?.sourceHash === sourceHash && existing.status === "READY") {
      report.readyReused += 1;
      continue;
    }
    if (
      options.apply &&
      options.retry &&
      existing?.sourceHash === sourceHash &&
      existing.valueJson !== null
    ) {
      const refreshedQa = validateTranslation(
        source.sourceValueJson,
        existing.valueJson,
        { protectedTerms: sourceCandidate.protectedNames },
      );
      if (refreshedQa.valid) {
        await db
          .update(contentTranslations)
          .set({
            status: "READY",
            qaMetadata: {
              shapeValid: true,
              issues: [],
              checkedAt: new Date().toISOString(),
              checkerVersion: TRANSLATION_PROMPT_VERSION,
            },
            failureReason: null,
          })
          .where(eq(contentTranslations.id, existing.id));
        report.readyReused += 1;
        report.writes += 1;
        continue;
      }
    }
    if (
      existing?.sourceHash === sourceHash &&
      existing.status !== "STALE" &&
      !options.retry
    ) {
      report.skippedExistingNonReady += 1;
      continue;
    }
    if (existing) report.stale += 1;
    else report.missing += 1;
    if (!options.apply) continue;

    try {
      const translated = await translateWithRetry({
        source: source.sourceValueJson,
        entityType: source.entityType,
        field: source.field,
        protectedNames: sourceCandidate.protectedNames,
      }, () => {
        report.apiCalls += 1;
      });
      const qa = validateTranslation(
        source.sourceValueJson,
        translated.value,
        {
          protectedTerms: sourceCandidate.protectedNames,
        },
      );
      const status = qa.valid ? "READY" : "REVIEW_REQUIRED";

      await db.transaction(async (tx) => {
        if (existing?.sourceHash === sourceHash) {
          await tx
            .update(contentTranslations)
            .set({
              sourceValueJson: source.sourceValueJson,
              valueJson: translated.value,
              status,
              method: "AI",
              model: translated.model,
              promptVersion: translated.promptVersion,
              qaMetadata: {
                shapeValid: qa.valid,
                issues: qa.issues.map(
                  (issue) => `${issue.code}: ${issue.detail}`,
                ),
                checkedAt: new Date().toISOString(),
                checkerVersion: TRANSLATION_PROMPT_VERSION,
              },
              failureReason: null,
              isCurrent: true,
            })
            .where(eq(contentTranslations.id, existing.id));
          return;
        }
        if (existing) {
          await tx
            .update(contentTranslations)
            .set({
              isCurrent: false,
              status: "STALE",
            })
            .where(eq(contentTranslations.id, existing.id));
        }
        await tx.insert(contentTranslations).values({
          entityType: source.entityType,
          entityId: source.entityId,
          field: source.field,
          sourceLocale: source.sourceLocale ?? "ro",
          targetLocale: source.targetLocale,
          sourceValueJson: source.sourceValueJson,
          valueJson: translated.value,
          sourceHash,
          status,
          method: "AI",
          model: translated.model,
          promptVersion: translated.promptVersion,
          qaMetadata: {
            shapeValid: qa.valid,
            issues: qa.issues.map((issue) => `${issue.code}: ${issue.detail}`),
            checkedAt: new Date().toISOString(),
            checkerVersion: TRANSLATION_PROMPT_VERSION,
          },
          failureReason: null,
          isCurrent: true,
        });
      });
      report.writes += existing?.sourceHash === sourceHash ? 1 : existing ? 2 : 1;
      if (status === "REVIEW_REQUIRED") report.reviewRequired += 1;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown translation failure";
      report.failed += 1;
      report.failures.push({
        entityType: source.entityType,
        entityId: source.entityId,
        field: source.field,
        reason,
      });
      try {
        await db.transaction(async (tx) => {
          if (existing?.sourceHash === sourceHash) {
            await tx
              .update(contentTranslations)
              .set({
                status: "FAILED",
                method: "AI",
                model: report.model,
                promptVersion: TRANSLATION_PROMPT_VERSION,
                failureReason: reason,
                isCurrent: true,
              })
              .where(eq(contentTranslations.id, existing.id));
            return;
          }
          if (existing) {
            await tx
              .update(contentTranslations)
              .set({ status: "STALE", isCurrent: false })
              .where(eq(contentTranslations.id, existing.id));
          }
          await tx.insert(contentTranslations).values({
            entityType: source.entityType,
            entityId: source.entityId,
            field: source.field,
            sourceLocale: source.sourceLocale ?? "ro",
            targetLocale: source.targetLocale,
            sourceValueJson: source.sourceValueJson,
            valueJson: null,
            sourceHash,
            status: "FAILED",
            method: "AI",
            model: report.model,
            promptVersion: TRANSLATION_PROMPT_VERSION,
            qaMetadata: {
              shapeValid: false,
              issues: ["translation_failed"],
              checkedAt: new Date().toISOString(),
              checkerVersion: TRANSLATION_PROMPT_VERSION,
            },
            failureReason: reason,
            isCurrent: true,
          });
        });
        report.writes +=
          existing?.sourceHash === sourceHash ? 1 : existing ? 2 : 1;
      } catch (persistenceError) {
        report.failures.push({
          entityType: source.entityType,
          entityId: source.entityId,
          field: source.field,
          reason: `Could not persist FAILED status: ${
            persistenceError instanceof Error
              ? persistenceError.message
              : "unknown persistence error"
          }`,
        });
      }
    }
  }

  await writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) process.exitCode = 2;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

