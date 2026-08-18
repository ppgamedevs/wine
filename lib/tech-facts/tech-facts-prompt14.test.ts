import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  selectPrompt14EvidenceClaims,
} from "@/lib/tech-facts/backfill";
import { claimIdentityHash } from "@/lib/tech-facts/hash";
import {
  persistWineFactEvidenceStrict,
  type EvidenceInsertFn,
} from "@/lib/tech-facts/persist";
import { GOLDEN_CURATION_STATS } from "@/lib/pairing/golden-curation-dataset";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type {
  FieldRecoveryResult,
  ProvenanceQualification,
  TechFactClaim,
} from "@/lib/tech-facts/types";

function makeClaim(
  overrides: Partial<TechFactClaim> = {},
): TechFactClaim {
  const hash =
    overrides.claimIdentityHash ??
    claimIdentityHash([
      overrides.field ?? "alcohol",
      String(overrides.value ?? 13.5),
      overrides.sourceUrl ?? "https://cramelerecas.ro/fisa.pdf",
      overrides.sourceWineName ?? "Solo Quinta",
      overrides.sourceVintage ?? 2025,
      overrides.excerpt ?? "Alcool 13,5% vol",
    ]);
  return {
    field: "alcohol",
    value: 13.5,
    unit: "% vol",
    sourceUrl: "https://cramelerecas.ro/fisa.pdf",
    sourceType: "tasting_sheet",
    sourceWineName: "Solo Quinta",
    sourceVintage: 2025,
    sourceDocumentTitle: "Solo Quinta 2025",
    excerpt: "Alcool 13,5% vol",
    extractionMethod: "deterministic",
    identityMatchClass: "EXACT_WINE_EXACT_VINTAGE",
    sourceNameClass: "SOURCE_NAME_EXACT",
    sourceVintageClass: "SOURCE_VINTAGE_EXPLICIT",
    confidence: 0.9,
    observedAt: "2026-08-18T08:00:00.000Z",
    sourceHash: hash,
    claimIdentityHash: hash,
    ...overrides,
  };
}

function makeField(
  qualification: ProvenanceQualification = "QUALIFIED_EXACT",
  claims: TechFactClaim[] = [makeClaim()],
  overrides: Partial<FieldRecoveryResult> = {},
): FieldRecoveryResult {
  return {
    field: "alcohol",
    stored: 13.5,
    candidate: 13.5,
    candidateClass: "SAFE_EXACT",
    storedClass: "VERIFIED_MATCH",
    action: "EVIDENCE_ATTACH",
    safeAutomatic: true,
    claims,
    qualification,
    qualificationReasons: [],
    ...overrides,
  };
}

function uniqueInsert(): EvidenceInsertFn {
  const stored = new Set<string>();
  return async (rows) => {
    let inserted = 0;
    for (const row of rows) {
      const key = `${row.wineId}|${row.field}|${row.sourceHash}`;
      if (stored.has(key)) continue;
      stored.add(key);
      inserted += 1;
    }
    return inserted;
  };
}

describe("Prompt 14 evidence-only backfill", () => {
  it("A/B/C: strict persistence reports actual 4, 0, and mixed 1 inserts", async () => {
    const insert = uniqueInsert();
    const first = [0, 1, 2, 3].map((index) =>
      makeClaim({
        field: index % 2 === 0 ? "alcohol" : "vintage",
        value: index % 2 === 0 ? 13.5 : 2025,
        claimIdentityHash: `a${index}`.padEnd(64, "0"),
        sourceHash: `a${index}`.padEnd(64, "0"),
      }),
    );
    expect(await persistWineFactEvidenceStrict(1, first, insert)).toBe(4);
    expect(await persistWineFactEvidenceStrict(1, first, insert)).toBe(0);
    expect(
      await persistWineFactEvidenceStrict(
        1,
        [...first.slice(0, 3), makeClaim({
          claimIdentityHash: "new".padEnd(64, "0"),
          sourceHash: "new".padEnd(64, "0"),
        })],
        insert,
      ),
    ).toBe(1);
  });

  it("D: QUALIFIED_EXACT stored match can insert", () => {
    expect(selectPrompt14EvidenceClaims(makeField())).toHaveLength(1);
  });

  it("E: QUALIFIED_CORROBORATED stores both matching official claims", () => {
    const claims = [
      makeClaim({ claimIdentityHash: "1".repeat(64), sourceHash: "1".repeat(64) }),
      makeClaim({
        sourceUrl: "https://cramelerecas.ro/produs",
        claimIdentityHash: "2".repeat(64),
        sourceHash: "2".repeat(64),
      }),
    ];
    expect(
      selectPrompt14EvidenceClaims(
        makeField("QUALIFIED_CORROBORATED", claims, {
          candidateClass: "SAFE_CORROBORATED",
        }),
      ),
    ).toHaveLength(2);
  });

  it.each([
    "LEGACY_ONLY",
    "DIFFERENT_VINTAGE",
    "AMBIGUOUS_PRODUCT",
    "SOURCE_CONFLICT",
    "RETAILER_ONLY",
  ] as const)("F-J: %s cannot insert", (qualification) => {
    expect(
      selectPrompt14EvidenceClaims(makeField(qualification)),
    ).toHaveLength(0);
  });

  it("K: current/stored value mismatch blocks evidence", () => {
    expect(
      selectPrompt14EvidenceClaims(
        makeField("QUALIFIED_EXACT", [makeClaim()], { candidate: 14 }),
      ),
    ).toHaveLength(0);
  });

  it("L: qualified evidence requires a non-null SHA-256 hash", () => {
    expect(
      selectPrompt14EvidenceClaims(
        makeField("QUALIFIED_EXACT", [
          makeClaim({ claimIdentityHash: "", sourceHash: "" }),
        ]),
      ),
    ).toHaveLength(0);
  });

  it("M: qualified evidence requires an official source URL", () => {
    expect(
      selectPrompt14EvidenceClaims(
        makeField("QUALIFIED_EXACT", [makeClaim({ sourceUrl: null })]),
      ),
    ).toHaveLength(0);
  });

  it("N: qualified evidence requires a real excerpt", () => {
    expect(
      selectPrompt14EvidenceClaims(
        makeField("QUALIFIED_EXACT", [makeClaim({ excerpt: "" })]),
      ),
    ).toHaveLength(0);
  });

  it("O/P: unique identity ignores observedAt and prevents duplicates", async () => {
    const insert = uniqueInsert();
    const first = makeClaim({ observedAt: "2026-08-18T08:00:00.000Z" });
    const second = makeClaim({
      observedAt: "2026-08-19T08:00:00.000Z",
      claimIdentityHash: first.claimIdentityHash,
      sourceHash: first.sourceHash,
    });
    expect(await persistWineFactEvidenceStrict(1, [first], insert)).toBe(1);
    expect(await persistWineFactEvidenceStrict(1, [second], insert)).toBe(0);
    const migration = readFileSync(
      "drizzle/0026_wine_fact_evidence_unique.sql",
      "utf8",
    );
    expect(migration).toContain(
      "wine_fact_evidence_wine_field_hash_uidx",
    );
  });

  it("Q-V: backfill source has no wine, score, pairing, or editorial writer", () => {
    const source = readFileSync("lib/tech-facts/backfill.ts", "utf8");
    expect(source).not.toContain(".update(wines)");
    expect(source).not.toMatch(/recalculateValueScore|calculateInitialScores|mergeAnalysisScores/);
    expect(source).not.toMatch(/foodPairings.*set|pairing.*insert/i);
    expect(source).not.toMatch(/generateEditorial|generateExpert|OpenAI/);
  });

  it("W: golden dataset remains 30 wines and 102 pairings", () => {
    expect(GOLDEN_CURATION_STATS.wines).toBe(30);
    expect(GOLDEN_CURATION_STATS.pairings).toBe(102);
  });

  it("X: public mode remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
  });
});
