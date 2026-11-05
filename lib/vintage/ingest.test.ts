import { describe, expect, it } from "vitest";
import { validateVintageEvidence } from "@/lib/vintage/ingest";

const valid = {
  scope: "region",
  region: "Murfatlar",
  vintage: 2021,
  evidenceType: "official_report",
  impact: "positive",
  sourceUrl: "https://onvpv.ro/report",
  sourceTitle: "Raport",
  publisher: "ONVPV",
  excerpt: "Recoltă echilibrată.",
  confidence: 0.8,
  producerClaim: false,
  independent: true,
  regionalException: false,
};

describe("vintage evidence ingestion validation", () => {
  it("accepts a complete independent record", () => {
    const result = validateVintageEvidence([valid]);
    expect(result.valid).toBe(true);
    expect(result.evidence).toHaveLength(1);
  });

  it("rejects missing provenance and unsafe confidence", () => {
    const result = validateVintageEvidence([
      { ...valid, sourceUrl: "not-a-url", excerpt: " ", confidence: 2 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.evidence).toHaveLength(0);
  });

  it("keeps valid entries when another entry is invalid", () => {
    const result = validateVintageEvidence([valid, { ...valid, scope: "national" }]);
    expect(result.valid).toBe(false);
    expect(result.evidence).toHaveLength(1);
  });
});
