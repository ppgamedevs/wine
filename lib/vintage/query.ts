import { eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { vintageEvidence, wines } from "@/lib/schema";
import type { WineWithRelations } from "@/types";
import { assessVintage, compareVintageAssessments } from "@/lib/vintage/assessment";
import {
  buildVintageFamily,
  type VintageAssessment,
  type VintageEvidenceRecord,
  type VintageFamily,
} from "@/lib/vintage/types";
import { buildVintageStory, type VintageStory } from "@/lib/vintage/story";
import type { AppLocale } from "@/i18n/locale";

export interface VintageIntelligence {
  family: VintageFamily;
  assessment: VintageAssessment;
  story: VintageStory;
  comparisons: Array<{
    left: { wine: WineWithRelations; assessment: VintageAssessment };
    right: { wine: WineWithRelations; assessment: VintageAssessment };
    differences: string[];
  }>;
}

function evidenceFromRow(row: typeof vintageEvidence.$inferSelect): VintageEvidenceRecord {
  return {
    id: row.id,
    scope: row.scope as VintageEvidenceRecord["scope"],
    region: row.region,
    appellation: row.appellation,
    grape: row.grape,
    wineryId: row.wineryId,
    wineId: row.wineId,
    familyKey: row.familyKey,
    vintage: row.vintage,
    evidenceType: row.evidenceType as VintageEvidenceRecord["evidenceType"],
    impact: row.impact as VintageEvidenceRecord["impact"],
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    publisher: row.publisher,
    publishedAt: row.publishedAt,
    eventDate: row.eventDate,
    excerpt: row.excerpt,
    confidence: row.confidence,
    producerClaim: row.producerClaim,
    independent: row.independent,
    regionalException: row.regionalException,
    maturity: row.maturity as VintageEvidenceRecord["maturity"],
  };
}

export async function loadVintageEvidence(
  familyWines: WineWithRelations[],
): Promise<VintageEvidenceRecord[]> {
  const years = [...new Set(
    familyWines.map((wine) => wine.vintage).filter(
      (year): year is number => year != null && Number.isInteger(year),
    ),
  )];
  const includesNonVintage = familyWines.some((wine) => wine.vintage == null);
  if (years.length === 0 && !includesNonVintage) return [];
  const filter =
    years.length > 0 && includesNonVintage
      ? or(inArray(vintageEvidence.vintage, years), isNull(vintageEvidence.vintage))
      : years.length > 0
        ? inArray(vintageEvidence.vintage, years)
        : isNull(vintageEvidence.vintage);
  try {
    const rows = await db.select().from(vintageEvidence).where(filter);
    return rows.map(evidenceFromRow);
  } catch {
    // Migration 0030 may not be applied; fail closed with no evidence.
    return [];
  }
}

async function loadFamilyCandidates(wine: WineWithRelations): Promise<WineWithRelations[]> {
  if (!wine.wineryId) return [wine];
  try {
    const rows = await db.query.wines.findMany({
      with: { winery: true, region: true },
      where: eq(wines.wineryId, wine.wineryId),
    });
    return rows as WineWithRelations[];
  } catch {
    return [wine];
  }
}

export async function loadVintageIntelligence(
  wine: WineWithRelations,
  locale: AppLocale,
): Promise<VintageIntelligence> {
  const candidates = await loadFamilyCandidates(wine);
  const family = buildVintageFamily(wine, [wine, ...candidates]);
  const releases = family.releases
    .map((release) => candidates.find((candidate) => candidate.id === release.id))
    .filter((candidate): candidate is WineWithRelations => candidate != null);
  const evidence = await loadVintageEvidence([wine, ...releases]);
  const assessments = releases.map((release) => ({
    wine: release,
    assessment: assessVintage({ wine: release, evidence }),
  }));
  const currentAssessment =
    assessments.find((item) => item.wine.id === wine.id)?.assessment ??
    assessVintage({ wine, evidence });
  const story = buildVintageStory({
    wine,
    assessment: currentAssessment,
    locale,
  });
  return {
    family,
    assessment: currentAssessment,
    story,
    comparisons: compareVintageAssessments(assessments),
  };
}

export interface VintageGuideEntry {
  region: string;
  vintage: number | null;
  evidenceCount: number;
  independentSources: number;
  classification: VintageAssessment["classification"];
  sources: Array<{ title: string; url: string }>;
}

export async function loadVintageGuide(): Promise<VintageGuideEntry[]> {
  let rows: Array<typeof vintageEvidence.$inferSelect> = [];
  try {
    rows = await db.select().from(vintageEvidence);
  } catch {
    return [];
  }
  const groups = new Map<string, Array<typeof vintageEvidence.$inferSelect>>();
  for (const row of rows) {
    if (!row.region || row.scope !== "region") continue;
    const key = `${row.region}\u0000${row.vintage ?? "NV"}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const [region, rawVintage] = key.split("\u0000");
      const evidence = group.map(evidenceFromRow);
      const positives = evidence.filter((item) => item.impact === "positive").length;
      const negatives = evidence.filter((item) => item.impact === "negative").length;
      const independentSources = new Set(
        evidence.filter((item) => item.independent).map((item) => item.sourceUrl),
      ).size;
      const classification: VintageAssessment["classification"] =
        evidence.length < 2 || independentSources === 0
          ? "insufficient"
          : positives > 0 && negatives > 0
            ? "mixed"
            : negatives >= 2 && positives === 0
              ? "difficult"
              : positives >= 2
                ? "favorable"
                : "mixed";
      return {
        region: region ?? "",
        vintage: rawVintage === "NV" ? null : Number(rawVintage),
        evidenceCount: evidence.length,
        independentSources,
        classification,
        sources: [...new Map(evidence.map((item) => [item.sourceUrl, {
          title: item.sourceTitle,
          url: item.sourceUrl,
        }])).values()],
      };
    })
    .sort((left, right) => left.region.localeCompare(right.region) || (right.vintage ?? 0) - (left.vintage ?? 0));
}
