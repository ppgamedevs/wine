import { describe, expect, it } from "vitest";
import { evaluateImportWorkflow } from "@/lib/wine-import-workflow";
import type { PublicQualityScore, PublicValueScore } from "@/lib/public-quality-score";

const qualityKnown: PublicQualityScore = {
  status: "known",
  score: 76,
  confidence: 82,
  source: "quality_final",
  evidence: ["tasting evidence", "region"],
  missing: [],
  reason: "known",
};
const valueUnknown: PublicValueScore = {
  status: "unavailable",
  score: null,
  priceRon: null,
  offerId: null,
  reason: "qualified_price_required",
};

function base() {
  return {
    candidate: {
      slug: "murfatlar-premiat-eticheta-neagra-rosu-0-75l",
      sourceUrl: "https://murfatlar-vinul.ro/premiat/?variant=rosu-750ml",
      variantKey: "rosu",
      bottleSizeMl: 750,
      vintage: null,
      producer: "Murfatlar",
      name: "Premiat Eticheta Neagra Roșu, 0.75L",
    },
    identity: { exactProduct: true, conflicts: [] as string[] },
    sources: [
      {
        kind: "official_producer_page",
        url: "https://murfatlar-vinul.ro/premiat/",
        authorized: true,
      },
    ],
    evidence: { structuredClaims: 8, tastingNotes: true, technicalFields: 2 },
    conflicts: [] as Array<{ field: string; resolution: string }>,
    editorial: { description: "Descriere fundamentata pe fisa producatorului.", grounded: true },
    quality: qualityKnown,
    value: valueUnknown,
    catalogGates: { identityComplete: true, sourceCount: 1, criticalIssues: [] as string[] },
    currentStatus: "verified" as const,
  };
}

describe("import-to-publication workflow", () => {
  it("recommends publication only when identity, evidence and gates pass", () => {
    const result = evaluateImportWorkflow(base());
    expect(result.recommendation).toBe("publish");
    expect(result.blockedReason).toBeNull();
    expect(result.steps).toHaveLength(10);
    expect(result.steps.every((step) => step.idempotencyKey.length > 0)).toBe(true);
    expect(result.steps.find((step) => step.id === "compute_value")?.status).toBe(
      "pending",
    );
  });

  it("queues an admin import with no verified status for review", () => {
    const input = base();
    input.currentStatus = "user_submitted" as never;
    const result = evaluateImportWorkflow(input);
    expect(result.recommendation).toBe("manual_review");
    expect(result.steps.at(-1)?.details.recommendation).toBe("manual_review");
  });

  it("blocks an identity conflict and does not mark the candidate publishable", () => {
    const input = base();
    input.identity.exactProduct = false;
    input.identity.conflicts = ["same slug maps to two different variants"];
    const result = evaluateImportWorkflow(input);
    expect(result.recommendation).toBe("blocked");
    expect(result.blockedReason).toContain("two different variants");
    expect(result.steps.find((step) => step.id === "validate_identity")?.status).toBe(
      "blocked",
    );
  });

  it("keeps value pending when no qualified price exists", () => {
    const result = evaluateImportWorkflow(base());
    const value = result.steps.find((step) => step.id === "compute_value");
    expect(value?.details.status).toBe("unavailable");
    expect(result.summary.valueScore).toBeNull();
    expect(result.summary.qualityScore).toBe(76);
  });
});
