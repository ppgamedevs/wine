import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVED_MANIFEST_A,
  APPROVED_MANIFEST_B_IDENTITIES,
  applySourceEntryToRecord,
  deterministicManifestHash,
  evidenceManifestKey,
  planEvidenceMutations,
  planSourceMutations,
  validateEnvelope,
  validateManifestA,
  validateManifestB,
  validateManifestC,
  type CurrentSourceRow,
  type Prompt18EvidenceManifestEntry,
} from "@/lib/tech-facts/prompt18-manifests";
import {
  GOLDEN_CURATION_STATS,
} from "@/lib/pairing/golden-curation-dataset";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";

function frozenEvidence(): Prompt18EvidenceManifestEntry[] {
  return APPROVED_MANIFEST_B_IDENTITIES.map((row) => ({
    ...row,
    unit: row.field === "alcohol" ? "% vol" : null,
    sourceType: row.winery === "balla-geza" ? "producer_catalog" : "producer_page",
    sourceWineName: row.slug,
    sourceVintage:
      row.slug.includes("2015") ? 2015 : row.slug.includes("2023") ? 2023 : row.slug.includes("2022") ? 2022 : null,
    sourceDocumentTitle: row.slug,
    excerpt: `Explicit ${row.field}: ${row.value}`,
    extractionMethod: "deterministic",
    identityMatchClass: "EXACT_WINE_EXACT_VINTAGE",
    confidence: 0.99,
    observedAt: "2026-08-18T00:00:00.000Z",
    qualification: "QUALIFIED_MATCH_EXISTING",
    stability: "STABLE",
  }));
}

function currentSourceRows(): CurrentSourceRow[] {
  return APPROVED_MANIFEST_A.map((row) => ({
    id: row.wineId,
    slug: row.slug,
    producerPageUrl: row.field === "producerPageUrl" ? row.oldUrl : null,
    tastingSheetUrl: row.field === "tastingSheetUrl" ? row.oldUrl : null,
  }));
}

describe("Prompt 18 supervised production manifests", () => {
  it("A. requires the exact old URL", () => {
    const rows = currentSourceRows();
    rows[0]!.producerPageUrl = "https://example.invalid/newer-human-fix";
    expect(planSourceMutations(APPROVED_MANIFEST_A, rows)[0]!.status).toBe("STALE_MANIFEST");
  });

  it("B. stale source values are skipped instead of overwritten", () => {
    const entry = APPROVED_MANIFEST_A[0]!;
    const row = { ...currentSourceRows()[0]!, producerPageUrl: "https://example.invalid/new" };
    expect(applySourceEntryToRecord(row, entry)).toEqual(row);
  });

  it("C-D. clear actions update only their approved URL field", () => {
    const producer = APPROVED_MANIFEST_A.find((row) => row.action === "CLEAR_PRODUCER_PAGE")!;
    const tasting = APPROVED_MANIFEST_A.find((row) => row.action === "CLEAR_TASTING_SHEET")!;
    const producerRow: CurrentSourceRow = {
      id: producer.wineId,
      slug: producer.slug,
      producerPageUrl: producer.oldUrl,
      tastingSheetUrl: "https://example.com/keep.pdf",
    };
    const tastingRow: CurrentSourceRow = {
      id: tasting.wineId,
      slug: tasting.slug,
      producerPageUrl: "https://example.com/keep",
      tastingSheetUrl: tasting.oldUrl,
    };
    expect(applySourceEntryToRecord(producerRow, producer)).toEqual({
      ...producerRow,
      producerPageUrl: null,
    });
    expect(applySourceEntryToRecord(tastingRow, tasting)).toEqual({
      ...tastingRow,
      tastingSheetUrl: null,
    });
  });

  it("E. Cuvée Amélie has only the exact approved replacement", () => {
    const row = APPROVED_MANIFEST_A.find((entry) => entry.wineId === 209)!;
    expect(row.newUrl).toBe("https://www.avincis.ro/cuvee-amelie-vin-avincis-62-ro.htm");
  });

  it("F. an unmanifested source URL cannot enter Batch A", () => {
    const rows = APPROVED_MANIFEST_A.map((row) => ({ ...row }));
    rows[0] = { ...rows[0]!, wineId: 999 };
    expect(() => validateManifestA(rows)).toThrow(/Unapproved/);
  });

  it("G and X. a second source apply plans zero writes", () => {
    const applied = currentSourceRows().map((row) => {
      const entry = APPROVED_MANIFEST_A.find((candidate) => candidate.wineId === row.id)!;
      return applySourceEntryToRecord(row, entry);
    });
    const plan = planSourceMutations(APPROVED_MANIFEST_A, applied);
    expect(plan.every((row) => row.status === "ALREADY_APPLIED")).toBe(true);
  });

  it("H. Batch B permits exactly the nine approved claim hashes", () => {
    const rows = frozenEvidence();
    expect(() => validateManifestB(rows)).not.toThrow();
    expect(new Set(rows.map(evidenceManifestKey)).size).toBe(9);
  });

  it("I. a stale canonical value blocks evidence insertion", () => {
    const entry = frozenEvidence()[0]!;
    const plan = planEvidenceMutations(
      [entry],
      [{
        id: entry.wineId,
        slug: entry.slug,
        alcohol: 14,
        sweetness: null,
        vintage: null,
      }],
      new Set(),
    );
    expect(plan[0]!.status).toBe("STALE_VALUE_OR_CONFLICT");
  });

  it("J. wineId, field, and sourceHash deduplication blocks insertion", () => {
    const entry = frozenEvidence()[0]!;
    const plan = planEvidenceMutations(
      [entry],
      [{
        id: entry.wineId,
        slug: entry.slug,
        alcohol: 15,
        sweetness: null,
        vintage: null,
      }],
      new Set([evidenceManifestKey(entry)]),
    );
    expect(plan[0]!.status).toBe("ALREADY_PERSISTED");
  });

  it("K. Batch B fails closed above nine claims", () => {
    const rows = frozenEvidence();
    expect(() => validateManifestB([...rows, rows[0]!])).toThrow(/exceeds 9/);
  });

  it("L. Budureasca evidence is excluded", () => {
    expect(frozenEvidence().every((row) => row.winery === "balla-geza" || row.winery === "avincis")).toBe(true);
  });

  it("M-N-O. unresolved facts and empty Batch C cannot mutate technical values", () => {
    expect(APPROVED_MANIFEST_B_IDENTITIES.some((row) => row.wineId === 310 || row.wineId === 343)).toBe(false);
    expect(() => validateManifestC([])).not.toThrow();
    expect(() => validateManifestC([{} as never])).toThrow(/empty mandatory no-op/);
  });

  it("P-Q. pending approved evidence validates as a canonical MATCH", () => {
    const entry = frozenEvidence()[0]!;
    const plan = planEvidenceMutations(
      [entry],
      [{
        id: entry.wineId,
        slug: entry.slug,
        alcohol: 15,
        sweetness: null,
        vintage: null,
      }],
      new Set(),
    );
    expect(plan[0]!.currentValue).toBe(entry.value);
    expect(plan[0]!.status).toBe("PENDING");
  });

  it("R-S-T. the apply runner has no score, pairing, or editorial write path", () => {
    const source = readFileSync("scripts/prompt18-manifest-apply.ts", "utf8");
    expect(source).not.toMatch(/set\(\{[^]*?valueScore/);
    expect(source).not.toMatch(/set\(\{[^]*?foodPairings/);
    expect(source).not.toMatch(/set\(\{[^]*?descriptionEditorial/);
  });

  it("U. retained public detail rendering remains network-free", () => {
    for (const path of ["app/wines/[slug]/page.tsx", "app/vinuri/[slug]/page.tsx"]) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/runReadOnlyCatalogRecovery|probeOfficialSource/);
    }
  });

  it("V-W. golden curation and secondary shadow mode remain fixed", () => {
    expect(GOLDEN_CURATION_STATS).toMatchObject({ wines: 30, pairings: 102 });
    expect(getSecondaryScoringMode()).toBe("shadow");
  });

  it("rejects a modified immutable manifest hash", () => {
    const entries = APPROVED_MANIFEST_A;
    const envelope = {
      prompt: 18 as const,
      batch: "A" as const,
      version: 1 as const,
      prompt17Commit: "1736bd1" as const,
      frozenAt: "2026-08-18T00:00:00.000Z",
      entriesHash: deterministicManifestHash(entries),
      entries,
    };
    expect(() => validateEnvelope(envelope, "A")).not.toThrow();
    expect(() => validateEnvelope({ ...envelope, entriesHash: "0".repeat(64) }, "A")).toThrow(/hash mismatch/);
  });
});
