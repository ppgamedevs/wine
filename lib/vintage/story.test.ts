import { describe, expect, it } from "vitest";
import { assessVintage } from "@/lib/vintage/assessment";
import {
  buildVintageComparisonCopy,
  buildVintageStory,
  classificationLabel,
} from "@/lib/vintage/story";
import { buildVintageFamily, type VintageEvidenceRecord } from "@/lib/vintage/types";
import type { WineWithRelations } from "@/types";

const wine = {
  id: 1,
  slug: "zestrea-2021",
  name: "Zestrea Muscat Ottonel Demisec 2021 0.75L",
  vintage: 2021,
  type: "white",
  sweetness: "demisec",
  grapeVarieties: [{ name: "Muscat Ottonel" }],
  winery: { id: 10, name: "Murfatlar" },
  region: { id: 3, name: "Murfatlar" },
} as unknown as WineWithRelations;

function evidence(overrides: Partial<VintageEvidenceRecord> = {}): VintageEvidenceRecord {
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
    sourceUrl: "https://onvpv.ro/report",
    sourceTitle: "Raport oficial",
    publisher: "ONVPV",
    publishedAt: "2022-01-01",
    eventDate: "2021-09-15",
    excerpt: "Recoltă echilibrată.",
    confidence: 0.9,
    producerClaim: false,
    independent: true,
    regionalException: false,
    ...overrides,
  };
}

describe("vintage story presentation", () => {
  it("localizes classification and never adds a numeric quality score", () => {
    const assessment = assessVintage({
      wine,
      evidence: [
        evidence(),
        evidence({
          evidenceType: "critic_review",
          sourceUrl: "https://critic.example/2021",
          excerpt: "Aciditate vie.",
        }),
      ],
    });
    const ro = buildVintageStory({ wine, assessment, locale: "ro" });
    const en = buildVintageStory({ wine, assessment, locale: "en" });
    expect(ro.classificationLabel).toBe("Favorabilă");
    expect(en.classificationLabel).toBe("Favorable");
    expect(ro.summary).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(en.summary).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(ro.facts.length).toBeGreaterThan(0);
    expect(ro.timeline[0]?.eventDate).toBe("2021-09-15");
  });

  it("states insufficient evidence without inventing a classification", () => {
    const assessment = assessVintage({ wine, evidence: [] });
    const story = buildVintageStory({ wine, assessment, locale: "ro" });
    expect(assessment.classification).toBe("insufficient");
    expect(story.classificationLabel).toBe("Dovezi insuficiente");
    expect(story.interpretation).toEqual([]);
    expect(story.summary).toContain("Nu avem încă suficiente dovezi");
  });

  it("flags release differences in comparison copy", () => {
    const family = buildVintageFamily(wine, [
      wine,
      { ...wine, id: 2, slug: "zestrea-2025", name: "Zestrea Muscat Ottonel Demisec 2025 1L" },
    ]);
    expect(buildVintageComparisonCopy(family, "ro")).toContain("diferențe");
    expect(classificationLabel("mixed", "en")).toBe("Mixed");
  });
});
