import { describe, expect, it } from "vitest";
import {
  SOURCE_TRIAGE_CODES,
  applyJevSemanticJudgment,
  detectDuplicateCandidatePairs,
  parseBottleSizeMl,
  triageSourceCandidate,
  type CatalogWineIdentity,
  type SourceCandidateIdentity,
} from "@/lib/jev/provenance-triage";

const CATALOG: CatalogWineIdentity = {
  id: 42,
  slug: "crama-x-feteasca-neagra-2021",
  name: "Feteasca Neagra 2021",
  wineryName: "Crama X",
  vintage: 2021,
  type: "red",
  grapes: ["Feteasca Neagra"],
  sweetness: "sec",
  alcohol: 13.5,
};

function codes(findings: Array<{ code: string }>): string[] {
  return findings.map((finding) => finding.code);
}

describe("parseBottleSizeMl", () => {
  it("parses common bottle sizes", () => {
    expect(parseBottleSizeMl("750 ml")).toBe(750);
    expect(parseBottleSizeMl("1,5 l")).toBe(1_500);
    expect(parseBottleSizeMl("Magnum 1500 ML")).toBe(1_500);
    expect(parseBottleSizeMl("2021")).toBeNull();
    expect(parseBottleSizeMl(null)).toBeNull();
  });
});

describe("triageSourceCandidate: deterministic identity", () => {
  it("matches an exact wine and vintage", () => {
    const result = triageSourceCandidate(CATALOG, {
      wineName: "Feteasca Neagra",
      producerName: "Crama X",
      vintage: 2021,
    });
    expect(result.identityClass).toBe("EXACT_WINE_EXACT_VINTAGE");
    expect(result.action).toBe("likely_match");
    expect(result.readOnly).toBe(true);
    expect(result.verifiedEligible).toBe(false);
  });

  it("detects a vintage mismatch and locks the decision", () => {
    const result = triageSourceCandidate(CATALOG, {
      wineName: "Feteasca Neagra",
      producerName: "Crama X",
      vintage: 2022,
    });
    expect(codes(result.findings)).toContain(SOURCE_TRIAGE_CODES.VINTAGE_MISMATCH);
    expect(result.identityClass).toBe("EXACT_WINE_DIFFERENT_VINTAGE");
    expect(result.conflicts).toContain(SOURCE_TRIAGE_CODES.VINTAGE_MISMATCH);
    expect(result.lockedByDeterministic).toBe(true);
    expect(result.action).toBe("review");
    expect(result.verifiedEligible).toBe(false);
    // Never treated as an exact verified product match.
    expect(result.identityClass).not.toBe("EXACT_WINE_EXACT_VINTAGE");
  });

  it("detects a producer mismatch", () => {
    const result = triageSourceCandidate(CATALOG, {
      wineName: "Feteasca Neagra",
      producerName: "Alt Producator",
      vintage: 2021,
    });
    expect(result.conflicts).toContain(SOURCE_TRIAGE_CODES.PRODUCER_MISMATCH);
    expect(result.lockedByDeterministic).toBe(true);
  });

  it("detects a bottle size mismatch against the catalog name", () => {
    const magnum = { ...CATALOG, name: "Feteasca Neagra Magnum 1,5 l" };
    const result = triageSourceCandidate(magnum, {
      wineName: "Feteasca Neagra Magnum",
      vintage: 2021,
      bottleSizeMl: 750,
    });
    expect(result.conflicts).toContain(SOURCE_TRIAGE_CODES.BOTTLE_SIZE_MISMATCH);
  });

  it("detects contradictory sweetness through the shared source rules", () => {
    const result = triageSourceCandidate(CATALOG, {
      wineName: "Feteasca Neagra",
      producerName: "Crama X",
      vintage: 2021,
      sweetness: "dulce",
    });
    expect(result.findings.some((finding) => finding.severity === "high")).toBe(true);
    expect(result.lockedByDeterministic).toBe(true);
  });

  it("reports insufficient evidence instead of guessing", () => {
    const result = triageSourceCandidate(CATALOG, { url: "https://example.test" });
    expect(result.identityClass).toBe("SOURCE_IDENTITY_INCOMPLETE");
    expect(result.action).toBe("insufficient_evidence");
    expect(codes(result.findings)).toContain(
      SOURCE_TRIAGE_CODES.INSUFFICIENT_IDENTITY,
    );
  });

  it("flags a clearly different wine name", () => {
    const result = triageSourceCandidate(CATALOG, {
      wineName: "Cabernet Sauvignon",
      vintage: 2021,
    });
    expect(result.conflicts).toContain(SOURCE_TRIAGE_CODES.NAME_MISMATCH);
    expect(result.identityClass).toBe("PRODUCT_MISMATCH");
  });
});

describe("applyJevSemanticJudgment", () => {
  const vintageMismatch = triageSourceCandidate(CATALOG, {
    wineName: "Feteasca Neagra",
    producerName: "Crama X",
    vintage: 2022,
  });

  it("cannot override a deterministic vintage conflict", () => {
    const judged = applyJevSemanticJudgment(vintageMismatch, {
      sameProductFamily: true,
      sourceRelevance: "primary_source",
      contradictoryDescription: false,
      confidence: 0.95,
    });
    expect(judged.identityClass).toBe("EXACT_WINE_DIFFERENT_VINTAGE");
    expect(judged.action).toBe("review");
    expect(judged.verifiedEligible).toBe(false);
    expect(codes(judged.findings)).toContain(SOURCE_TRIAGE_CODES.JEV_CANNOT_OVERRIDE);
  });

  it("does not upgrade insufficient evidence to a verified match", () => {
    const insufficient = triageSourceCandidate(CATALOG, {
      url: "https://example.test",
    });
    const judged = applyJevSemanticJudgment(insufficient, {
      sameProductFamily: true,
      sourceRelevance: "primary_source",
      contradictoryDescription: false,
      confidence: 0.9,
    });
    expect(judged.identityClass).toBe("SOURCE_IDENTITY_INCOMPLETE");
    expect(judged.action).toBe("insufficient_evidence");
    expect(judged.verifiedEligible).toBe(false);
  });

  it("can make the assistant more cautious", () => {
    const likely = triageSourceCandidate(CATALOG, {
      wineName: "Feteasca Neagra Rezerva",
      vintage: 2021,
    });
    expect(likely.identityClass).toBe("LIKELY_WINE");
    const judged = applyJevSemanticJudgment(likely, {
      sameProductFamily: false,
      sourceRelevance: "unrelated",
      contradictoryDescription: true,
      confidence: 0.9,
    });
    expect(judged.identityClass).toBe("SOURCE_IDENTITY_INCOMPLETE");
    expect(judged.action).toBe("review");
    expect(codes(judged.findings)).toContain(
      SOURCE_TRIAGE_CODES.JEV_UNRELATED_SOURCE,
    );
  });

  it("ignores low-confidence judgments", () => {
    const likely = triageSourceCandidate(CATALOG, {
      wineName: "Feteasca Neagra Rezerva",
      vintage: 2021,
    });
    const judged = applyJevSemanticJudgment(likely, {
      sameProductFamily: false,
      sourceRelevance: "unrelated",
      contradictoryDescription: true,
      confidence: 0.2,
    });
    expect(judged.identityClass).toBe(likely.identityClass);
    expect(codes(judged.findings)).toContain(
      SOURCE_TRIAGE_CODES.JEV_LOW_CONFIDENCE,
    );
  });
});

describe("detectDuplicateCandidatePairs", () => {
  it("suggests pairs for manual review without merging", () => {
    const pairs = detectDuplicateCandidatePairs([
      { ...CATALOG, wineryId: 1 },
      {
        ...CATALOG,
        id: 43,
        slug: "crama-x-feteasca-neagra-2021-rezerva",
        name: "Feteasca Neagra 2021 Rezerva",
        wineryId: 1,
      },
      {
        ...CATALOG,
        id: 44,
        slug: "crama-y-feteasca-neagra-2021",
        name: "Feteasca Neagra 2021",
        wineryName: "Crama Y",
        wineryId: 2,
      },
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.leftSlug).toBe("crama-x-feteasca-neagra-2021");
    expect(pairs[0]?.rightSlug).toBe("crama-x-feteasca-neagra-2021-rezerva");
    expect(pairs[0]?.similarity).toBeGreaterThanOrEqual(0.75);
  });

  it("does not pair different vintages", () => {
    const pairs = detectDuplicateCandidatePairs([
      { ...CATALOG, wineryId: 1 },
      { ...CATALOG, id: 45, vintage: 2022, wineryId: 1 },
    ]);
    expect(pairs).toHaveLength(0);
  });
});

describe("truth layer invariants", () => {
  it("never returns verifiedEligible true, whatever the evidence", () => {
    const candidates: SourceCandidateIdentity[] = [
      { wineName: "Feteasca Neagra", producerName: "Crama X", vintage: 2021 },
      { wineName: "Feteasca Neagra", producerName: "Crama X", vintage: 2022 },
      { url: "https://example.test" },
    ];
    for (const candidate of candidates) {
      expect(triageSourceCandidate(CATALOG, candidate).verifiedEligible).toBe(false);
    }
  });
});
