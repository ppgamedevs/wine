import { describe, expect, it } from "vitest";
import { assessVintage, selectVintageEvidence } from "@/lib/vintage/assessment";
import {
  buildVintageFamily,
  canCompareReleases,
  wineFamilyKey,
  type VintageEvidenceRecord,
} from "@/lib/vintage/types";
import type { WineWithRelations } from "@/types";

function wine(overrides: Partial<WineWithRelations> = {}): WineWithRelations {
  return {
    id: 1,
    slug: "zestrea-muscat-2021",
    name: "Zestrea Muscat Ottonel Demisec 2021 0.75L",
    vintage: 2021,
    type: "white",
    sweetness: "demisec",
    grapeVarieties: [{ name: "Muscat Ottonel" }],
    winery: { id: 10, name: "Murfatlar", slug: "murfatlar" },
    region: { id: 3, name: "Murfatlar", slug: "murfatlar" },
    ...overrides,
  } as unknown as WineWithRelations;
}

function evidence(
  overrides: Partial<VintageEvidenceRecord> = {},
): VintageEvidenceRecord {
  return {
    scope: "region",
    region: "Murfatlar",
    appellation: null,
    grape: null,
    wineryId: 10,
    wineId: null,
    familyKey: null,
    vintage: 2021,
    evidenceType: "official_report",
    impact: "positive",
    sourceUrl: "https://onvpv.ro/report-2021",
    sourceTitle: "Raport oficial 2021",
    publisher: "ONVPV",
    publishedAt: "2022-01-01",
    excerpt: "Recoltă echilibrată, cu aciditate bună.",
    confidence: 0.9,
    producerClaim: false,
    independent: true,
    regionalException: false,
    ...overrides,
  };
}

describe("vintage family identity", () => {
  it("connects vintage releases without merging them", () => {
    const first = wine();
    const second = wine({ id: 2, slug: "zestrea-muscat-2025", name: "Zestrea Muscat Ottonel Demisec 2025 0.75L", vintage: 2025 });
    expect(
      wineFamilyKey({ name: first.name, producer: "Murfatlar", range: null, color: "white", sweetness: "demisec" }),
    ).toBe(
      wineFamilyKey({ name: second.name, producer: "Murfatlar", range: null, color: "white", sweetness: "demisec" }),
    );
    const family = buildVintageFamily(first, [first, second]);
    expect(family.releases).toHaveLength(2);
    expect(family.releases[0]?.vintage).toBe(2025);
    expect(canCompareReleases(family.releases[0]!, family.releases[1]!)).toBe(true);
  });

  it("detects blend and bottle-format differences and keeps non-vintage products", () => {
    const first = wine();
    const differentBlend = wine({
      id: 3,
      vintage: 2025,
      name: "Zestrea Muscat Ottonel Demisec 2025 1L",
      grapeVarieties: [{ name: "Muscat Ottonel" }, { name: "Fetească Albă" }],
    });
    const family = buildVintageFamily(first, [first, differentBlend]);
    expect(family.differences.map((item) => item.field)).toEqual(
      expect.arrayContaining(["blend", "bottle_format"]),
    );
    const nonVintage = wine({ id: 4, vintage: null, name: "Zestrea Muscat Ottonel Demisec NV 0.75L" });
    expect(buildVintageFamily(nonVintage, [nonVintage]).releases[0]?.vintage).toBeNull();
  });

  it("does not merge different sweetness variants", () => {
    expect(
      wineFamilyKey({ name: "Zestrea Muscat Ottonel 2021", producer: "Murfatlar", range: null, color: "white", sweetness: "demisec" }),
    ).not.toBe(
      wineFamilyKey({ name: "Zestrea Muscat Ottonel 2021", producer: "Murfatlar", range: null, color: "white", sweetness: "demidulce" }),
    );
  });
});

describe("vintage assessment", () => {
  it("returns insufficient without enough independent evidence", () => {
    const result = assessVintage({ wine: wine(), evidence: [evidence()] });
    expect(result.classification).toBe("insufficient");
    expect(result.sources).toHaveLength(1);
  });

  it("classifies corroborated positive evidence as favorable", () => {
    const result = assessVintage({
      wine: wine(),
      evidence: [
        evidence(),
        evidence({
          sourceUrl: "https://independent.example/2021",
          publisher: "Independent critic",
          evidenceType: "critic_review",
          excerpt: "Fruct bun și aciditate vie.",
        }),
      ],
    });
    expect(result.classification).toBe("favorable");
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies contradictory evidence as mixed", () => {
    const result = assessVintage({
      wine: wine(),
      evidence: [
        evidence(),
        evidence({
          impact: "negative",
          evidenceType: "disease_hail",
          excerpt: "Presiune de boală înainte de recoltă.",
          sourceUrl: "https://independent.example/disease",
        }),
      ],
    });
    expect(result.classification).toBe("mixed");
    expect(result.weaknesses.length).toBeGreaterThan(0);
  });

  it("does not use another region's evidence", () => {
    const otherRegion = evidence({ region: "Dealu Mare", sourceUrl: "https://example/dealu" });
    expect(selectVintageEvidence(wine(), [otherRegion])).toEqual([]);
    expect(assessVintage({ wine: wine(), evidence: [otherRegion] }).classification).toBe(
      "insufficient",
    );
  });

  it("uses the most specific matching scope and preserves exceptions", () => {
    const result = assessVintage({
      wine: wine(),
      evidence: [
        evidence({ scope: "wine", wineId: 1, regionalException: true }),
        evidence({
          scope: "wine",
          wineId: 1,
          sourceUrl: "https://independent.example/wine",
          evidenceType: "critic_review",
          excerpt: "Sticla păstrează prospețimea.",
        }),
        evidence({ region: "Dealu Mare", sourceUrl: "https://example/other" }),
      ],
    });
    expect(result.evidenceCount).toBe(2);
    expect(result.regionalExceptions).toHaveLength(1);
  });

  it("reports maturity only from explicit guidance", () => {
    const result = assessVintage({
      wine: wine(),
      evidence: [
        evidence(),
        evidence({
          evidenceType: "maturity_guidance",
          maturity: "can_age",
          excerpt: "Producătorul recomandă 3-5 ani.",
          sourceUrl: "https://producer.example/maturity",
        }),
      ],
    });
    expect(result.maturity).toBe("can_age");
    expect(result.maturityText).toContain("3-5");
  });
});
