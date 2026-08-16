import { describe, expect, it } from "vitest";
import { planDeterministicRepairs } from "@/lib/catalog-cleanup";
import {
  constrainClaimsToSource,
  extractEvidenceFromSourceText,
} from "@/lib/evidence-extract";
import {
  applyEvidencePatchIdempotent,
  buildEvidencePatch,
  diffWineEvidence,
  type BackfillWine,
  type EvidenceFetchResult,
} from "@/lib/evidence-backfill";
import { mergeProducerContent } from "@/lib/evidence-merge";
import { TRUTH_ISSUE_CODES, validateEditorialClaims } from "@/lib/editorial-claim-validator";
import { buildGenericPairingGuidance } from "@/lib/generic-pairing-guidance";
import type { WineScanInput } from "@/lib/integrity-scan";
import { detectSourceConflicts } from "@/lib/source-conflicts";
import { calculateVinIntelScore } from "@/lib/scoring-v2";

function wine(overrides: Partial<BackfillWine> = {}): BackfillWine {
  return {
    id: 1,
    slug: "test-wine",
    name: "Test Wine",
    wineryId: 1,
    wineryName: "Crama Test",
    winerySlug: "crama-test",
    wineryWebsite: "https://cramatest.ro",
    regionId: 1,
    regionName: "Dealu Mare",
    type: "red",
    sweetness: "sec",
    vintage: 2021,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    priceAvg: 60,
    currentPrice: 60,
    priceHistory: [],
    valueScore: 78,
    criticScore: null,
    ratingAvg: null,
    communityScore: null,
    medals: [],
    status: "verified",
    sourceUrl: "https://vinul.ro/test",
    affiliateLinks: [],
    descriptionEditorial: "Acest vin are note de barrique si taninuri ferme.",
    tasteProfile: "barrique, taninuri",
    foodPairingNotes: [],
    foodPairings: [],
    tastingNotes: null,
    producerContent: null,
    producerPageUrl: null,
    tastingSheetUrl: null,
    alcohol: 13.5,
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("A. evidence extraction never infers absent oak", () => {
  it("returns oakAged unknown when the source is silent", () => {
    const extracted = extractEvidenceFromSourceText(
      "Vin sec din Dealu Mare, 13.5% alcool, Feteasca Neagra.",
    );
    expect(extracted.oakAged).toBe("unknown");
    expect(extracted.oakDurationMonths).toBe("unknown");
  });
});

describe("B. absence of tannin evidence does not become tannins=false", () => {
  it("keeps tanninMentioned unknown", () => {
    const extracted = extractEvidenceFromSourceText("Culoare rubinie, final mediu.");
    expect(extracted.tanninMentioned).toBe("unknown");
  });
});

describe("C. producer evidence resolves an unsupported oak claim", () => {
  it("drops UNSUPPORTED_OAK_CLAIM after producer oak text is attached", () => {
    const before = validateEditorialClaims(
      { descriptionEditorial: "Acest vin are note de stejar.", tasteProfile: "stejar" },
      { type: "red", sweetness: "sec" },
    );
    expect(before.some((issue) => issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM)).toBe(
      true,
    );

    const after = validateEditorialClaims(
      { descriptionEditorial: "Acest vin are note de stejar.", tasteProfile: "stejar" },
      {
        type: "red",
        sweetness: "sec",
        producerContent: { tastingNotes: "Maturat in stejar.", facts: { oakAged: true } },
      },
    );
    expect(after.some((issue) => issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM)).toBe(
      false,
    );
  });
});

describe("D. partial evidence validates only the supported fragment", () => {
  it("keeps duration and vanilla unsupported when source only mentions oak", () => {
    const issues = validateEditorialClaims(
      {
        descriptionEditorial:
          "Acest vin a stat 12 luni in baric francez de prima folosinta, care ii ofera vanilie intensa.",
        tasteProfile: "vanilie, baric francez",
      },
      {
        type: "red",
        sweetness: "sec",
        producerContent: { tastingNotes: "Maturat in stejar." },
      },
    );
    expect(issues.some((issue) => issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM)).toBe(
      false,
    );
    expect(issues.some((issue) => issue.code === TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_DETAIL)).toBe(
      true,
    );
  });
});

describe("E. source conflict is detected", () => {
  it("flags incompatible sweetness and grapes", () => {
    const issues = detectSourceConflicts(
      {
        id: 1,
        slug: "conflict-wine",
        sweetness: "sec",
        grapeVarieties: [{ name: "Feteasca Neagra" }],
      },
      { sweetness: "demisec", grapes: ["Feteasca Neagra", "Merlot"] },
    );
    const codes = issues.map((issue) => issue.code);
    expect(codes).toContain("SOURCE_CONFLICT_SWEETNESS");
    expect(codes).toContain("SOURCE_CONFLICT_GRAPES");
  });
});

describe("F. dry-run mutates nothing", () => {
  it("does not call persist when apply is false", async () => {
    const writes: number[] = [];
    const fetched: EvidenceFetchResult = {
      ok: true,
      fetchFailed: false,
      producerPageUrl: "https://avincis.ro/vin",
      producerText: "Maturat in stejar. 13.5% alcool.",
      combinedText: "Maturat in stejar. 13.5% alcool.",
    };

    const { runEvidenceBackfill } = await import("@/lib/evidence-backfill");
    await runEvidenceBackfill({
      apply: false,
      wineSlug: "test-wine",
      deps: {
        loadWines: async () => [wine()],
        fetchEvidence: async () => fetched,
        persist: async (id) => {
          writes.push(id);
        },
        sleepMs: 0,
      },
    });

    expect(writes).toEqual([]);
  });

  it("buildEvidencePatch leaves the original wine untouched", () => {
    const original = wine({ tastingNotes: "Nota existenta." });
    const snapshot = structuredClone(original);
    buildEvidencePatch(original, {
      ok: true,
      fetchFailed: false,
      producerText: "Maturat in stejar.",
      combinedText: "Maturat in stejar.",
      producerPageUrl: "https://avincis.ro/vin",
    });
    expect(original).toEqual(snapshot);
  });
});

describe("G. apply mode is idempotent", () => {
  it("merging the same producer content twice does not duplicate URLs or notes", () => {
    const incoming = {
      tastingNotes: "Maturat in stejar.",
      sourceUrls: ["https://avincis.ro/vin"],
      extractedAt: "2026-08-16T00:00:00.000Z",
      facts: { oakAged: true as const },
    };
    const once = mergeProducerContent(null, incoming);
    const twice = mergeProducerContent(once, incoming);
    expect(twice.sourceUrls).toEqual(["https://avincis.ro/vin"]);
    expect(twice.tastingNotes).toBe("Maturat in stejar.");

    const base = wine();
    const patch = buildEvidencePatch(base, {
      ok: true,
      fetchFailed: false,
      producerPageUrl: "https://avincis.ro/vin",
      producerText: "Maturat in stejar.",
      combinedText: "Maturat in stejar.",
    }).patch;
    expect(patch).not.toBeNull();
    const applied = applyEvidencePatchIdempotent(base, patch!);
    const appliedAgain = applyEvidencePatchIdempotent(applied, patch!);
    expect(appliedAgain.producerContent?.sourceUrls).toEqual(
      applied.producerContent?.sourceUrls,
    );
    expect(appliedAgain.tastingNotes).toBe(applied.tastingNotes);
  });
});

describe("H. failed fetch never clears stored data", () => {
  it("keeps tasting notes and producer content", () => {
    const stored = wine({
      tastingNotes: "Note existente de producator.",
      producerContent: {
        tastingNotes: "Stejar mentionat.",
        sourceUrls: ["https://avincis.ro/vin"],
      },
      producerPageUrl: "https://avincis.ro/vin",
    });
    const { patch, afterWine } = buildEvidencePatch(stored, {
      ok: false,
      fetchFailed: true,
      fetchError: "timeout",
    });
    expect(patch).toBeNull();
    expect(afterWine.tastingNotes).toBe("Note existente de producator.");
    expect(afterWine.producerContent?.tastingNotes).toBe("Stejar mentionat.");
    expect(afterWine.producerPageUrl).toBe("https://avincis.ro/vin");
  });
});

describe("I. white-wine impossible tannin/red-fruit cleanup still works", () => {
  it("removes only the unsupported sentence", () => {
    const input: WineScanInput = wine({
      type: "white",
      grapeVarieties: [{ name: "Sauvignon Blanc" }],
      descriptionEditorial:
        "Este un vin produs de Crama X din Dealu Mare. Are taninuri impresionante si 18 luni in baric francez. La 65 lei are un pret competitiv.",
      tasteProfile: "taninuri ferme, fructe rosii",
      foodPairingNotes: [{ dish: "Sarmale", note: "Taninurile echilibreaza grasimea." }],
    });
    const { next } = planDeterministicRepairs(input, [
      {
        wineId: 1,
        slug: "test-wine",
        severity: "high",
        code: TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM,
        message: "tanin",
        blocksPublication: true,
      },
      {
        wineId: 1,
        slug: "test-wine",
        severity: "high",
        code: TRUTH_ISSUE_CODES.EDITORIAL_PAIRING_UNSUPPORTED,
        message: "pairing",
        blocksPublication: true,
      },
    ]);
    expect(next.descriptionEditorial).toContain("Crama X");
    expect(next.descriptionEditorial).toContain("65 lei");
    expect(next.descriptionEditorial).not.toContain("taninuri");
    expect(next.tasteProfile).toBeNull();
    expect(next.foodPairingNotes).toEqual([]);
  });
});

describe("J. generic pairing guidance is untouched", () => {
  it("stays generic after cleanup planning", () => {
    const before = buildGenericPairingGuidance({ type: "white", sweetness: "sec" });
    planDeterministicRepairs(wine({ type: "white" }), []);
    const after = buildGenericPairingGuidance({ type: "white", sweetness: "sec" });
    expect(after).toEqual(before);
    expect(after.note).toMatch(/de regula|in general|de obicei/i);
  });
});

describe("K. evidence backfill does not change Value Score by itself", () => {
  it("does not write valueScore and score stays stable if scoring inputs are unchanged", () => {
    const base = wine({ valueScore: 81 });
    const { patch } = buildEvidencePatch(base, {
      ok: true,
      fetchFailed: false,
      producerPageUrl: "https://avincis.ro/vin",
      producerText: "Maturat in stejar.",
      combinedText: "Maturat in stejar.",
    });
    expect(patch).not.toBeNull();
    expect(patch).not.toHaveProperty("valueScore");

    const facts = {
      price: 60,
      wineType: "red",
      grapeVarieties: ["Feteasca Neagra"],
      region: "Dealu Mare",
      wineryName: "Crama Test",
    };
    const before = calculateVinIntelScore(facts);
    const after = calculateVinIntelScore(facts);
    expect(after.valueScore).toBe(before.valueScore);
  });
});

describe("L. AI extraction cannot introduce facts absent from source text", () => {
  it("drops claims that do not appear in the source", () => {
    const kept = constrainClaimsToSource(
      "Maturat in stejar. Alcool 13.5%.",
      ["Maturat in stejar", "taninuri catifelate", "12 luni in baric francez"],
    );
    expect(kept).toEqual(["Maturat in stejar"]);
  });
});

describe("diffWineEvidence fetch failure is non-destructive", () => {
  it("reports fetch_failed and keeps blocking counts", () => {
    const diff = diffWineEvidence(wine(), {
      ok: false,
      fetchFailed: true,
      fetchError: "404",
    });
    expect(diff.disposition).toBe("fetch_failed");
    expect(diff.wouldWrite).toBe(false);
    expect(diff.patch).toBeNull();
  });
});
