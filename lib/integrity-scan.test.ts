import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { query: { wines: { findMany: vi.fn() } } },
}));

import {
  detectContradictorySweetnessText,
  detectDuplicateCandidates,
  detectEditorialTruthIssues,
  detectInvalidAffiliateLinks,
  detectInvalidVintages,
  detectMissingSources,
  detectStalePrices,
  detectSuspiciousHighScores,
  detectThinContent,
  runIntegrityChecks,
  type WineScanInput,
} from "@/lib/integrity-scan";

const REFERENCE_DATE = new Date("2026-07-14T00:00:00.000Z");

function baseWine(overrides: Partial<WineScanInput> = {}): WineScanInput {
  return {
    id: 1,
    slug: "test-wine",
    name: "Test Wine",
    wineryId: 1,
    wineryName: "Crama Test",
    regionId: 1,
    regionName: "Dealu Mare",
    type: "red",
    sweetness: "sec",
    vintage: 2021,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    priceAvg: 60,
    currentPrice: 60,
    priceHistory: [{ date: "2026-07-01T00:00:00.000Z", price: 60, source: "https://example.com" }],
    valueScore: 78,
    criticScore: null,
    ratingAvg: null,
    communityScore: null,
    medals: [],
    status: "verified",
    sourceUrl: "https://retailer.example.com/wine",
    affiliateLinks: [],
    descriptionEditorial:
      "Un vin sec din Dealu Mare, produs de Crama Test, potrivit pentru preparate consistente de sezon.",
    tastingNotes: "Taninuri fine, fructe negre si aciditate buna.",
    foodPairings: [],
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("detectStalePrices", () => {
  it("does not flag a wine whose price was observed recently", () => {
    const issues = detectStalePrices([baseWine()], REFERENCE_DATE);
    expect(issues).toHaveLength(0);
  });

  it("flags a wine whose last price observation is older than the stale threshold", () => {
    const wine = baseWine({
      priceHistory: [
        { date: "2026-05-01T00:00:00.000Z", price: 60, source: "https://example.com" },
      ],
    });
    const issues = detectStalePrices([wine], REFERENCE_DATE);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("price_stale");
  });

  it("escalates to high severity for very stale prices", () => {
    const wine = baseWine({
      priceHistory: [
        { date: "2026-01-01T00:00:00.000Z", price: 60, source: "https://example.com" },
      ],
    });
    const issues = detectStalePrices([wine], REFERENCE_DATE);
    expect(issues[0].code).toBe("price_very_stale");
    expect(issues[0].severity).toBe("high");
  });

  it("ignores unpublished wines", () => {
    const wine = baseWine({
      status: "user_submitted",
      priceHistory: [],
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(detectStalePrices([wine], REFERENCE_DATE)).toHaveLength(0);
  });

  it("falls back to updatedAt when there is no price history", () => {
    const wine = baseWine({
      priceHistory: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const issues = detectStalePrices([wine], REFERENCE_DATE);
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("detectSuspiciousHighScores", () => {
  it("flags a stored score that exceeds the recalculated confidence ceiling", () => {
    const wine = baseWine({
      valueScore: 97,
      grapeVarieties: [],
      wineryName: null,
      regionName: null,
      medals: [],
      criticScore: null,
      ratingAvg: null,
      communityScore: null,
    });
    const issues = detectSuspiciousHighScores([wine]);
    expect(issues.some((i) => i.code === "score_above_confidence_ceiling")).toBe(
      true,
    );
  });

  it("does not flag a well-supported high score", () => {
    const wine = baseWine({
      valueScore: 90,
      grapeVarieties: [{ name: "Feteasca Neagra" }],
      wineryName: "Crama Test",
      regionName: "Dealu Mare",
      medals: [
        { competition: "Concurs", medal: "gold" },
        { competition: "Concurs 2", medal: "gold" },
      ],
      criticScore: 92,
      ratingAvg: 4.5,
      communityScore: 85,
    });
    const issues = detectSuspiciousHighScores([wine]);
    expect(issues).toHaveLength(0);
  });

  it("ignores wines without a stored value score", () => {
    const wine = baseWine({ valueScore: null });
    expect(detectSuspiciousHighScores([wine])).toHaveLength(0);
  });
});

describe("detectInvalidVintages", () => {
  it("flags future vintages beyond the accepted horizon", () => {
    const wine = baseWine({ vintage: 2099 });
    const issues = detectInvalidVintages([wine], 2026);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("critical");
  });

  it("does not flag a plausible vintage", () => {
    const wine = baseWine({ vintage: 2022 });
    expect(detectInvalidVintages([wine], 2026)).toHaveLength(0);
  });

  it("does not flag non-vintage (NV) wines represented as null", () => {
    const wine = baseWine({ vintage: null });
    expect(detectInvalidVintages([wine], 2026)).toHaveLength(0);
  });
});

describe("detectMissingSources", () => {
  it("flags a published wine with no source URL and no affiliate links", () => {
    const wine = baseWine({ sourceUrl: null, affiliateLinks: [] });
    const issues = detectMissingSources([wine]);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("missing_source");
  });

  it("does not flag a wine with at least an affiliate link", () => {
    const wine = baseWine({
      sourceUrl: null,
      affiliateLinks: [{ retailer: "eMAG", url: "https://emag.ro/x" }],
    });
    expect(detectMissingSources([wine])).toHaveLength(0);
  });

  it("ignores unpublished drafts", () => {
    const wine = baseWine({
      status: "user_submitted",
      sourceUrl: null,
      affiliateLinks: [],
    });
    expect(detectMissingSources([wine])).toHaveLength(0);
  });
});

describe("detectInvalidAffiliateLinks", () => {
  it("flags a structurally invalid affiliate URL", () => {
    const wine = baseWine({
      affiliateLinks: [{ retailer: "eMAG", url: "not-a-valid-url" }],
    });
    const issues = detectInvalidAffiliateLinks([wine]);
    expect(issues).toHaveLength(1);
  });

  it("flags a non-http(s) protocol as a redirect safety risk", () => {
    const wine = baseWine({
      affiliateLinks: [{ retailer: "eMAG", url: "javascript:alert(1)" }],
    });
    expect(detectInvalidAffiliateLinks([wine])).toHaveLength(1);
  });

  it("accepts a well-formed https affiliate URL", () => {
    const wine = baseWine({
      affiliateLinks: [{ retailer: "eMAG", url: "https://emag.ro/product/x" }],
    });
    expect(detectInvalidAffiliateLinks([wine])).toHaveLength(0);
  });
});

describe("detectThinContent", () => {
  it("flags a published wine with no editorial description", () => {
    const wine = baseWine({ descriptionEditorial: null });
    const issues = detectThinContent([wine]);
    expect(issues[0].code).toBe("missing_editorial_content");
  });

  it("flags a very short description as thin content", () => {
    const wine = baseWine({ descriptionEditorial: "Vin bun." });
    const issues = detectThinContent([wine]);
    expect(issues[0].code).toBe("thin_editorial_content");
  });

  it("does not flag a substantial description", () => {
    const wine = baseWine({
      descriptionEditorial:
        "Un vin echilibrat din Dealu Mare, potrivit pentru preparate consistente de sezon si mese lungi de familie.",
    });
    expect(detectThinContent([wine])).toHaveLength(0);
  });
});

describe("detectContradictorySweetnessText", () => {
  it("flags a dry-classified wine whose text describes it as sweet", () => {
    const wine = baseWine({
      sweetness: "sec",
      descriptionEditorial: "Un vin dulce, cu note de fructe coapte.",
    });
    const issues = detectContradictorySweetnessText([wine]);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("sweetness_contradiction");
  });

  it("flags a sweet-classified wine whose text plainly calls it dry", () => {
    const wine = baseWine({
      sweetness: "dulce",
      descriptionEditorial: "Un vin sec, cu final lung.",
    });
    const issues = detectContradictorySweetnessText([wine]);
    expect(issues).toHaveLength(1);
  });

  it("does not flag consistent sweetness descriptions", () => {
    const wine = baseWine({
      sweetness: "sec",
      descriptionEditorial: "Un vin sec, cu taninuri fine.",
    });
    expect(detectContradictorySweetnessText([wine])).toHaveLength(0);
  });
});

describe("detectDuplicateCandidates", () => {
  it("flags two wines from the same winery/vintage/type with near-identical names", () => {
    const wines = [
      baseWine({ id: 1, slug: "crama-x-cabernet-2020", name: "Cabernet Sauvignon Rezerva" }),
      baseWine({ id: 2, slug: "crama-x-cabernet-2020-b", name: "Cabernet Sauvignon Rezerva" }),
    ];
    const groups = detectDuplicateCandidates(wines);
    expect(groups).toHaveLength(1);
    expect(groups[0].wineIds.sort()).toEqual([1, 2]);
  });

  it("does not flag wines with different vintages", () => {
    const wines = [
      baseWine({ id: 1, vintage: 2020, name: "Cabernet Sauvignon Rezerva" }),
      baseWine({ id: 2, vintage: 2021, name: "Cabernet Sauvignon Rezerva" }),
    ];
    expect(detectDuplicateCandidates(wines)).toHaveLength(0);
  });

  it("does not flag wines from different wineries even with identical names", () => {
    const wines = [
      baseWine({ id: 1, wineryId: 1, name: "Cuvee Speciala" }),
      baseWine({ id: 2, wineryId: 2, name: "Cuvee Speciala" }),
    ];
    expect(detectDuplicateCandidates(wines)).toHaveLength(0);
  });

  it("does not flag genuinely distinct wines from the same winery/vintage", () => {
    const wines = [
      baseWine({ id: 1, name: "Cabernet Sauvignon" }),
      baseWine({ id: 2, name: "Chardonnay" }),
    ];
    expect(detectDuplicateCandidates(wines)).toHaveLength(0);
  });

  it("never merges automatically: only returns candidate pairs, not a merged record", () => {
    const wines = [
      baseWine({ id: 1, name: "Cabernet Sauvignon Rezerva" }),
      baseWine({ id: 2, name: "Cabernet Sauvignon Rezerva" }),
    ];
    const groups = detectDuplicateCandidates(wines);
    expect(groups[0].wineIds).toContain(1);
    expect(groups[0].wineIds).toContain(2);
    expect(groups[0]).not.toHaveProperty("merged");
  });
});

describe("detectEditorialTruthIssues", () => {
  it("flags a white wine with invented tannin copy", () => {
    const issues = detectEditorialTruthIssues([
      baseWine({
        type: "white",
        sweetness: "sec",
        tastingNotes: null,
        descriptionEditorial:
          "Acest vin are taninurile care echilibreaza grasimea de la gratar.",
        foodPairingNotes: [
          {
            dish: "Sarmale",
            note: "Taninurile echilibreaza grasimea.",
          },
        ],
      }),
    ]);
    expect(issues.some((issue) => issue.code === "UNSUPPORTED_TANNIN_CLAIM")).toBe(
      true,
    );
    expect(issues.some((issue) => issue.blocksPublication)).toBe(true);
  });
});

describe("runIntegrityChecks aggregation", () => {
  it("summarizes issue counts by severity and by code", () => {
    const wines = [
      baseWine({ id: 1, vintage: 2099 }),
      baseWine({ id: 2, sourceUrl: null, affiliateLinks: [] }),
    ];
    const report = runIntegrityChecks(wines, REFERENCE_DATE);
    expect(report.summary.totalWines).toBe(2);
    expect(report.summary.issuesBySeverity.critical).toBeGreaterThanOrEqual(1);
    expect(report.summary.issuesByCode.invalid_vintage).toBe(1);
    expect(report.summary.issuesByCode.missing_source).toBe(1);
  });

  it("returns an empty issue list for a fully clean, well-evidenced catalog", () => {
    const wines = [baseWine({ id: 1 }), baseWine({ id: 2, slug: "other-wine", name: "Other Wine" })];
    const report = runIntegrityChecks(wines, REFERENCE_DATE);
    expect(report.issues).toHaveLength(0);
  });
});
