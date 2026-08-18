import { isPrompt14Eligible } from "@/lib/tech-facts/qualify";
import {
  canonicalizeOfficialUrl,
  dedupePrompt18Evidence,
  type PersistedEvidenceIdentity,
  type Prompt18EvidenceEntry,
  type Prompt18SourceStability,
} from "@/lib/tech-facts/source-adjudication";
import {
  PUBLIC_TECH_FIELDS,
  resolvePublicTechnicalTrust,
  type PublicTechField,
  type PublicTrustEvidenceInput,
  type PublicTrustWineInput,
} from "@/lib/tech-facts/public-trust";
import { techValuesEqual, type TechFactClaim } from "@/lib/tech-facts/types";
import type { RecoverableWine, WineTechRecovery } from "@/lib/tech-facts/recover";

export interface Prompt17PersistedEvidence extends PersistedEvidenceIdentity {
  sourceType: string;
  sourceWineName: string | null;
  sourceVintage: number | null;
  sourceDocumentTitle: string | null;
  excerpt: string;
  extractionMethod: string;
  identityMatchClass: string;
  observedAt: string;
}

export interface Prompt17EvidenceDedupeReport {
  qualifiedMatchesDiscovered: Prompt18EvidenceEntry[];
  alreadyPersisted: Prompt18EvidenceEntry[];
  unstableOrAmbiguous: Prompt18EvidenceEntry[];
  newAttachCandidates: Prompt18EvidenceEntry[];
}

function fieldValue(claim: TechFactClaim): string | number | null {
  if (Array.isArray(claim.value)) return claim.value[0] ?? null;
  return claim.value;
}

function evidenceKey(input: {
  wineId: number;
  field: string;
  value: string | number | string[];
  sourceUrl: string | null;
}): string {
  const value = Array.isArray(input.value)
    ? input.value.map(String).join("|").toLowerCase()
    : String(input.value).toLowerCase();
  return [
    input.wineId,
    input.field,
    value,
    input.sourceUrl ? canonicalizeOfficialUrl(input.sourceUrl) : "",
  ].join(":");
}

export function buildPrompt18EvidenceCandidates(input: {
  wines: RecoverableWine[];
  recoveries: WineTechRecovery[];
  persistedEvidence: Prompt17PersistedEvidence[];
  stabilityByUrl: Map<string, Prompt18SourceStability>;
}): Prompt17EvidenceDedupeReport {
  const wineById = new Map(input.wines.map((wine) => [wine.id, wine]));
  const qualifiedMatchesDiscovered: Prompt18EvidenceEntry[] = [];
  const emitted = new Set<string>();

  for (const recovery of input.recoveries) {
    const wine = wineById.get(recovery.wineId);
    if (!wine) continue;
    for (const field of recovery.fields) {
      if (
        !PUBLIC_TECH_FIELDS.includes(field.field as PublicTechField) ||
        field.action !== "EVIDENCE_ATTACH" ||
        !isPrompt14Eligible(field.qualification) ||
        field.candidate == null
      ) {
        continue;
      }
      const claim = field.claims.find((row) => {
        const value = fieldValue(row);
        return (
          row.extractionMethod !== "legacy_producer_fact" &&
          row.sourceUrl != null &&
          row.sourceWineName != null &&
          value != null &&
          techValuesEqual(field.field, field.candidate!, value)
        );
      });
      const sourceClaim = claim ? fieldValue(claim) : null;
      if (!claim?.sourceUrl || sourceClaim == null) continue;
      const key = evidenceKey({
        wineId: wine.id,
        field: field.field,
        value: sourceClaim,
        sourceUrl: claim.sourceUrl,
      });
      if (emitted.has(key)) continue;
      emitted.add(key);
      qualifiedMatchesDiscovered.push({
        wineId: wine.id,
        slug: wine.slug,
        winery: wine.winerySlug ?? "unknown",
        field: field.field as Prompt18EvidenceEntry["field"],
        storedValue: field.candidate,
        sourceClaim,
        sourceUrl: claim.sourceUrl,
        sourceHash: claim.sourceHash,
        qualification: "QUALIFIED_MATCH_EXISTING",
        stability:
          input.stabilityByUrl.get(canonicalizeOfficialUrl(claim.sourceUrl)) ??
          "AMBIGUOUS",
      });
    }
  }

  const persistedKeys = new Set(
    input.persistedEvidence.map((row) =>
      evidenceKey({
        wineId: row.wineId,
        field: row.field,
        value: row.value,
        sourceUrl: row.sourceUrl,
      }),
    ),
  );
  const persistedHashes = new Set(
    input.persistedEvidence
      .filter((row) => row.sourceHash)
      .map((row) => `${row.wineId}:${row.field}:${row.sourceHash}`),
  );
  const alreadyPersisted = qualifiedMatchesDiscovered.filter((row) => {
    const key = evidenceKey({
      wineId: row.wineId,
      field: row.field,
      value: row.sourceClaim,
      sourceUrl: row.sourceUrl,
    });
    return (
      persistedKeys.has(key) ||
      Boolean(
        row.sourceHash &&
          persistedHashes.has(`${row.wineId}:${row.field}:${row.sourceHash}`),
      )
    );
  });
  const alreadyPersistedSet = new Set(alreadyPersisted);
  const unstableOrAmbiguous = qualifiedMatchesDiscovered.filter(
    (row) => !alreadyPersistedSet.has(row) && row.stability !== "STABLE",
  );
  const newAttachCandidates = dedupePrompt18Evidence(
    qualifiedMatchesDiscovered,
    input.persistedEvidence,
  );

  return {
    qualifiedMatchesDiscovered,
    alreadyPersisted,
    unstableOrAmbiguous,
    newAttachCandidates,
  };
}

function emptyCoverage(): Record<PublicTechField, number> {
  return Object.fromEntries(
    PUBLIC_TECH_FIELDS.map((field) => [field, 0]),
  ) as Record<PublicTechField, number>;
}

export function simulatePublicCoverageWithManifest(input: {
  wines: RecoverableWine[];
  persistedEvidence: Prompt17PersistedEvidence[];
  recoveries: WineTechRecovery[];
  manifest: Prompt18EvidenceEntry[];
}): {
  before: Record<PublicTechField, number>;
  afterManifestB: Record<PublicTechField, number>;
} {
  const before = emptyCoverage();
  const afterManifestB = emptyCoverage();
  const manifestKeys = new Set(
    input.manifest.map((row) =>
      evidenceKey({
        wineId: row.wineId,
        field: row.field,
        value: row.sourceClaim,
        sourceUrl: row.sourceUrl,
      }),
    ),
  );
  const evidenceByWine = new Map<number, PublicTrustEvidenceInput[]>();
  for (const row of input.persistedEvidence) {
    const current = evidenceByWine.get(row.wineId) ?? [];
    current.push({
      field: row.field as PublicTechField,
      valueJson: row.value,
      sourceUrl: row.sourceUrl,
      sourceType: row.sourceType as PublicTrustEvidenceInput["sourceType"],
      sourceWineName: row.sourceWineName,
      sourceVintage: row.sourceVintage,
      sourceDocumentTitle: row.sourceDocumentTitle,
      excerpt: row.excerpt,
      extractionMethod: row.extractionMethod as PublicTrustEvidenceInput["extractionMethod"],
      identityMatchClass: row.identityMatchClass as PublicTrustEvidenceInput["identityMatchClass"],
      observedAt: row.observedAt,
      sourceHash: row.sourceHash,
    });
    evidenceByWine.set(row.wineId, current);
  }
  const recoveryByWine = new Map(input.recoveries.map((row) => [row.wineId, row]));

  for (const wine of input.wines) {
    const currentEvidence = evidenceByWine.get(wine.id) ?? [];
    const additions: PublicTrustEvidenceInput[] = [];
    for (const field of recoveryByWine.get(wine.id)?.fields ?? []) {
      for (const claim of field.claims) {
        const value = fieldValue(claim);
        if (value == null || !claim.sourceUrl) continue;
        const key = evidenceKey({
          wineId: wine.id,
          field: claim.field,
          value,
          sourceUrl: claim.sourceUrl,
        });
        if (!manifestKeys.has(key)) continue;
        additions.push({
          field: claim.field as PublicTechField,
          valueJson: claim.value,
          sourceUrl: claim.sourceUrl,
          sourceType: claim.sourceType,
          sourceWineName: claim.sourceWineName,
          sourceVintage: claim.sourceVintage,
          sourceDocumentTitle: claim.sourceDocumentTitle,
          excerpt: claim.excerpt,
          extractionMethod: claim.extractionMethod,
          identityMatchClass: claim.identityMatchClass,
          observedAt: claim.observedAt,
          sourceHash: claim.sourceHash,
        });
      }
    }
    const wineInput: PublicTrustWineInput = {
      alcohol: wine.alcohol,
      acidity: wine.acidity,
      sugar: wine.sugar,
      sweetness: wine.sweetness,
      vintage: wine.vintage,
    };
    const current = resolvePublicTechnicalTrust(wineInput, currentEvidence);
    const simulated = resolvePublicTechnicalTrust(wineInput, [
      ...currentEvidence,
      ...additions,
    ]);
    for (const field of PUBLIC_TECH_FIELDS) {
      if (current.fields[field].status === "verified") before[field] += 1;
      if (simulated.fields[field].status === "verified") afterManifestB[field] += 1;
    }
  }
  return { before, afterManifestB };
}

export function tallyEvidenceByWineryAndField(
  rows: Prompt18EvidenceEntry[],
): Record<string, Record<string, number>> {
  return rows.reduce<Record<string, Record<string, number>>>((result, row) => {
    const winery = result[row.winery] ?? {};
    winery[row.field] = (winery[row.field] ?? 0) + 1;
    result[row.winery] = winery;
    return result;
  }, {});
}
