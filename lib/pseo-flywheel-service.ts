import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  pseoDraftPages,
  sommelierQuestionIntents,
  type PseoDraftStatus,
} from "@/lib/schema";
import {
  analyzeQuestion,
  buildGroundedDraft,
  clusterQuestionIntents,
  evaluateQualityGates,
  type FlywheelAnswerQuality,
  type FlywheelLanguage,
  type IntentCluster,
  type QualityGateResult,
  type GroundedDraft,
} from "@/lib/pseo-flywheel";
import { getWinesForSommelier } from "@/lib/queries";

export interface RecordQuestionInput {
  rawQuery: string;
  language: FlywheelLanguage;
  answerQuality: FlywheelAnswerQuality;
  recommendationCount: number;
  comparisonReference?: string | null;
  metadata?: Record<string, unknown>;
}

export interface FlywheelClusterReport {
  cluster: IntentCluster;
  gate: QualityGateResult;
  draft: GroundedDraft | null;
  existingDraft: {
    id: number;
    slug: string;
    locale: string;
    status: PseoDraftStatus;
    publishRecommendation: string;
    noindexUntilApproved: boolean;
  } | null;
}

export interface FlywheelReport {
  clusters: FlywheelClusterReport[];
  intents: Array<typeof sommelierQuestionIntents.$inferSelect>;
  blockedCount: number;
  draftCount: number;
  approvedCount: number;
}

function safeIntentsLimit(limit: number): number {
  return Math.min(2_000, Math.max(1, Math.trunc(limit)));
}

/**
 * Persist a real sommelier question. The writer must fail closed: a missing
 * migration or a transient DB error never affects the user-facing answer.
 */
export async function recordSommelierQuestion(
  input: RecordQuestionInput,
): Promise<void> {
  try {
    const analyzed = analyzeQuestion({
      rawQuery: input.rawQuery,
      language: input.language,
      answerQuality: input.answerQuality,
    });
    let similarPageExists = false;
    try {
      const [existing] = await db
        .select({ id: pseoDraftPages.id })
        .from(pseoDraftPages)
        .where(eq(pseoDraftPages.clusterKey, analyzed.topicCluster))
        .limit(1);
      similarPageExists = Boolean(existing);
    } catch {
      // Schema may not be migrated yet.
    }

    await db.insert(sommelierQuestionIntents).values({
      rawQuery: analyzed.rawQuery,
      normalizedQuery: analyzed.normalizedQuery,
      entitiesJson: analyzed.entities,
      topicCluster: analyzed.topicCluster,
      canonicalQuestion: analyzed.canonicalQuestion,
      intentType: analyzed.intentType,
      language: analyzed.language,
      answerQuality: analyzed.answerQuality,
      similarPageExists,
      blocked: analyzed.blocked,
      blockReason: analyzed.blockReason,
      metadataJson: {
        ...input.metadata,
        recommendationCount: input.recommendationCount,
        comparisonReference: input.comparisonReference ?? null,
      },
    });
  } catch (error) {
    console.warn("Sommelier question intent was not recorded", error);
  }
}

async function loadIntents(limit: number) {
  return db
    .select()
    .from(sommelierQuestionIntents)
    .orderBy(desc(sommelierQuestionIntents.createdAt))
    .limit(safeIntentsLimit(limit));
}

export async function loadFlywheelReport(limit = 400): Promise<FlywheelReport> {
  try {
  const intents = await loadIntents(limit);
  const parsed = intents.map((intent) => ({
    id: intent.id,
    rawQuery: intent.rawQuery,
    normalizedQuery: intent.normalizedQuery,
    entities: intent.entitiesJson,
    topicCluster: intent.topicCluster,
    canonicalQuestion: intent.canonicalQuestion,
    intentType: intent.intentType as GroundedDraft["pageType"],
    language: intent.language,
    answerQuality: intent.answerQuality,
    similarPageExists: intent.similarPageExists,
    blocked: intent.blocked,
    blockReason: intent.blockReason,
    referenceId: null,
    referenceName: null,
    pageType: intent.intentType as GroundedDraft["pageType"],
  }));
  // Reconstruct the reference fields from the canonical question so old rows
  // remain usable if the reference registry changes.
  const hydrated = parsed.map((record) => {
    const analyzed = analyzeQuestion({
      rawQuery: record.rawQuery,
      language: record.language as FlywheelLanguage,
      answerQuality: record.answerQuality,
      similarPageExists: record.similarPageExists,
    });
    return { ...record, ...analyzed, id: record.id };
  });
  const clusters = clusterQuestionIntents(hydrated);

  let wines: Awaited<ReturnType<typeof getWinesForSommelier>> = [];
  try {
    wines = await getWinesForSommelier();
  } catch {
    wines = [];
  }

  const existingDrafts = await db
    .select({
      id: pseoDraftPages.id,
      slug: pseoDraftPages.slug,
      locale: pseoDraftPages.locale,
      status: pseoDraftPages.status,
      publishRecommendation: pseoDraftPages.publishRecommendation,
      noindexUntilApproved: pseoDraftPages.noindexUntilApproved,
      clusterKey: pseoDraftPages.clusterKey,
    })
    .from(pseoDraftPages)
    .orderBy(desc(pseoDraftPages.updatedAt))
    .limit(500);

  const byCluster = new Map(
    existingDrafts.map((draft) => [draft.clusterKey, draft]),
  );

  const reports = clusters.slice(0, 40).map((cluster) => {
    const built = buildGroundedDraft({
      cluster,
      wines,
      locale: cluster.languages.includes("ro") ? "ro" : "en",
      duplicationRisk: byCluster.has(cluster.key) ? 0.1 : 0.05,
    });
    const gate =
      built?.gate ??
      evaluateQualityGates({
        cluster,
        supportingWineCount: 0,
        coverage: 0,
        confidence: 0,
        duplicationRisk: byCluster.has(cluster.key) ? 0.1 : 0.05,
      });
    return {
      cluster,
      gate,
      draft: built?.draft ?? null,
      existingDraft: byCluster.get(cluster.key) ?? null,
    };
  });

  return {
    clusters: reports,
    intents,
    blockedCount: hydrated.filter((record) => record.blocked).length,
    draftCount: existingDrafts.length,
    approvedCount: existingDrafts.filter((draft) =>
      ["approved", "published"].includes(draft.status),
    ).length,
  };
  } catch (error) {
    console.warn("PSEO flywheel report unavailable", error);
    return {
      clusters: [],
      intents: [],
      blockedCount: 0,
      draftCount: 0,
      approvedCount: 0,
    };
  }
}

export async function generatePseoDrafts(options: {
  dryRun?: boolean;
  limit?: number;
} = {}): Promise<{
  created: number;
  updated: number;
  skipped: number;
  generated: Array<{ slug: string; locale: string; status: string }>;
}> {
  const report = await loadFlywheelReport(options.limit ?? 400);
  const generated: Array<{ slug: string; locale: string; status: string }> = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of report.clusters) {
    if (!item.gate.passed || !item.draft) {
      skipped += 1;
      continue;
    }
    if (options.dryRun) {
      generated.push({
        slug: item.draft.slug,
        locale: item.draft.locale,
        status: "dry-run",
      });
      continue;
    }

    const existing = item.existingDraft;
    if (existing && ["approved", "published", "rejected"].includes(existing.status)) {
      skipped += 1;
      continue;
    }
    const values = {
      slug: item.draft.slug,
      locale: item.draft.locale,
      pageType: item.draft.pageType,
      title: item.draft.title,
      metaTitle: item.draft.metaTitle,
      metaDescription: item.draft.metaDescription,
      intro: item.draft.intro,
      contentMarkdown: item.draft.contentMarkdown,
      sectionsJson: item.draft.sections,
      faqJson: item.draft.faq,
      sourcesJson: item.draft.sources,
      generatedFromIntentCluster: item.draft.generatedFromIntentCluster,
      clusterKey: item.draft.clusterKey,
      confidence: item.draft.confidence,
      publishRecommendation: item.draft.publishRecommendation,
      noindexUntilApproved: true,
      status: "draft" as const,
      supportingWineCount: item.draft.supportingWineCount,
      demandCount: item.draft.demandCount,
      qualityGateJson: item.draft.qualityGate as unknown as Record<string, unknown>,
      sourceIntentIdsJson: item.draft.sourceIntentIds,
      reviewNotes: null,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await db
        .update(pseoDraftPages)
        .set(values)
        .where(eq(pseoDraftPages.id, existing.id));
      updated += 1;
    } else {
      await db.insert(pseoDraftPages).values(values);
      created += 1;
    }
    generated.push({
      slug: item.draft.slug,
      locale: item.draft.locale,
      status: "draft",
    });
  }

  return { created, updated, skipped, generated };
}

export async function reviewPseoDraft(input: {
  id: number;
  status: PseoDraftStatus;
  notes?: string;
}): Promise<void> {
  const approved = input.status === "approved" || input.status === "published";
  await db
    .update(pseoDraftPages)
    .set({
      status: input.status,
      noindexUntilApproved: !approved,
      reviewNotes: input.notes ?? null,
      approvedAt: approved ? new Date().toISOString() : null,
      approvedBy: approved ? "admin" : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(pseoDraftPages.id, input.id));
}

export async function loadPseoDraftById(id: number) {
  const [draft] = await db
    .select()
    .from(pseoDraftPages)
    .where(eq(pseoDraftPages.id, id))
    .limit(1);
  return draft ?? null;
}

export async function loadPseoDraftsForAdmin(limit = 100) {
  try {
    return await db
      .select()
      .from(pseoDraftPages)
      .orderBy(desc(pseoDraftPages.updatedAt))
      .limit(Math.min(200, Math.max(1, limit)));
  } catch (error) {
    console.warn("PSEO drafts unavailable", error);
    return [];
  }
}

export async function loadQuestionIntentSample(limit = 100) {
  return db
    .select()
    .from(sommelierQuestionIntents)
    .orderBy(desc(sommelierQuestionIntents.createdAt))
    .limit(Math.min(200, Math.max(1, limit)));
}

export async function markDraftReviewed(
  id: number,
  status: PseoDraftStatus,
  notes?: string,
): Promise<void> {
  await reviewPseoDraft({ id, status, notes });
}
