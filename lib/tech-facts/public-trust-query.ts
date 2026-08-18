import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wineFactEvidence, wines } from "@/lib/schema";
import {
  PUBLIC_TECH_FIELDS,
  resolvePublicTechnicalTrust,
  type PublicTechField,
  type PublicTechStatus,
  type PublicTechnicalTrust,
  type PublicTrustEvidenceInput,
  type PublicTrustWineInput,
} from "@/lib/tech-facts/public-trust";

const PUBLIC_EVIDENCE_COLUMNS = {
  field: wineFactEvidence.field,
  valueJson: wineFactEvidence.valueJson,
  sourceUrl: wineFactEvidence.sourceUrl,
  sourceType: wineFactEvidence.sourceType,
  sourceWineName: wineFactEvidence.sourceWineName,
  sourceVintage: wineFactEvidence.sourceVintage,
  sourceDocumentTitle: wineFactEvidence.sourceDocumentTitle,
  excerpt: wineFactEvidence.excerpt,
  extractionMethod: wineFactEvidence.extractionMethod,
  identityMatchClass: wineFactEvidence.identityMatchClass,
  observedAt: wineFactEvidence.observedAt,
  sourceHash: wineFactEvidence.sourceHash,
} as const;

export async function getPublicWineTechnicalTrust(
  wineId: number,
  wine: PublicTrustWineInput,
): Promise<PublicTechnicalTrust> {
  const evidence = await db
    .select(PUBLIC_EVIDENCE_COLUMNS)
    .from(wineFactEvidence)
    .where(eq(wineFactEvidence.wineId, wineId));
  return resolvePublicTechnicalTrust(wine, evidence);
}

export interface PublicTechnicalTrustAudit {
  wineCount: number;
  evidenceRowCount: number;
  evidenceHash: string;
  winesWithVerifiedFields: number;
  byField: Record<
    PublicTechField,
    Record<PublicTechStatus, number>
  >;
  conflicts: Array<{
    wineId: number;
    slug: string;
    field: PublicTechField;
  }>;
}

function emptyStatusCounts(): Record<PublicTechStatus, number> {
  return { verified: 0, catalog_only: 0, conflict: 0, unknown: 0 };
}

export async function runPublicTechnicalTrustAudit(): Promise<PublicTechnicalTrustAudit> {
  const [wineRows, evidenceRows] = await Promise.all([
    db
      .select({
        id: wines.id,
        slug: wines.slug,
        alcohol: wines.alcohol,
        acidity: wines.acidity,
        sugar: wines.sugar,
        sweetness: wines.sweetness,
        vintage: wines.vintage,
      })
      .from(wines)
      .where(eq(wines.status, "verified"))
      .orderBy(wines.id),
    db
      .select({
        id: wineFactEvidence.id,
        wineId: wineFactEvidence.wineId,
        ...PUBLIC_EVIDENCE_COLUMNS,
      })
      .from(wineFactEvidence)
      .orderBy(wineFactEvidence.id),
  ]);
  const evidenceByWine = new Map<number, PublicTrustEvidenceInput[]>();
  for (const evidence of evidenceRows) {
    const current = evidenceByWine.get(evidence.wineId) ?? [];
    current.push(evidence);
    evidenceByWine.set(evidence.wineId, current);
  }

  const byField = Object.fromEntries(
    PUBLIC_TECH_FIELDS.map((field) => [field, emptyStatusCounts()]),
  ) as PublicTechnicalTrustAudit["byField"];
  const conflicts: PublicTechnicalTrustAudit["conflicts"] = [];
  let winesWithVerifiedFields = 0;

  for (const wine of wineRows) {
    const trust = resolvePublicTechnicalTrust(
      wine,
      evidenceByWine.get(wine.id) ?? [],
    );
    if (trust.hasVerifiedFields) winesWithVerifiedFields += 1;
    for (const field of PUBLIC_TECH_FIELDS) {
      const status = trust.fields[field].status;
      byField[field][status] += 1;
      if (status === "conflict") {
        conflicts.push({ wineId: wine.id, slug: wine.slug, field });
      }
    }
  }

  return {
    wineCount: wineRows.length,
    evidenceRowCount: evidenceRows.length,
    evidenceHash: createHash("sha256")
      .update(JSON.stringify(evidenceRows))
      .digest("hex"),
    winesWithVerifiedFields,
    byField,
    conflicts,
  };
}
