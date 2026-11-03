import { describe, expect, it } from "vitest";
import {
  assessWineQuality,
  runCatalogQualityAudit,
} from "@/lib/quality/engine";
import {
  BENCHMARK_QUESTIONS,
  evaluateBenchmark,
  type BenchmarkAnswer,
  type BenchmarkAnswerSet,
} from "@/lib/quality/benchmark";
import { runQualityReleaseGate } from "@/lib/quality/release-gate";
import { SourceAttemptCache, planSourceGaps } from "@/lib/quality/source-gaps";
import type { QualityWine } from "@/lib/quality/types";

function makeWine(overrides: Partial<QualityWine> = {}): QualityWine {
  return {
    id: 1,
    slug: "zestrea-muscat-ottonel-demisec-2024-0-75l",
    name: "Zestrea Muscat Ottonel Demisec 2024 0.75L",
    producer: "Murfatlar",
    region: "Murfatlar",
    type: "white",
    sweetness: "demisec",
    vintage: 2024,
    grapeVarieties: ["Muscat Ottonel"],
    alcohol: 12.5,
    sugar: 12,
    acidity: 5.5,
    volumeMl: 750,
    tastingNotes:
      "Culoare: galben-verzui. Miros: soc, pere. Gust: echilibrat, corpolență medie, aciditate medie, taninuri fine, final remanent. Temperatura de servire: 7-8°C. Asocierea culinară: pește, pui.",
    descriptionEditorial: "Descriere publică atribuită producătorului.",
    foodPairings: ["pește", "pui"],
    servingTemperature: "7-8",
    sourceUrl: "https://murfatlar-vinul.ro/zestrea/",
    producerPageUrl: "https://murfatlar-vinul.ro/zestrea/",
    tastingSheetUrl: null,
    imageUrl: "https://murfatlar-vinul.ro/zestrea-alb.webp",
    priceAvg: 65,
    currentPrice: null,
    affiliateLinks: [],
    evidenceFields: ["alcohol", "sweetness", "vintage"],
    claimFields: [
      "producer",
      "range",
      "product_name",
      "grape_varieties",
      "bottle_volume",
      "wine_color",
      "sweetness",
      "alcohol",
      "appellation",
      "region",
      "country",
      "serving_temperature",
      "visual_appearance",
      "aroma_descriptors",
      "taste_descriptors",
      "body",
      "acidity_perception",
      "tannin_perception",
      "finish",
      "food_pairing",
    ],
    updatedAt: new Date().toISOString(),
    hasQualifiedProfitshareOffer: true,
    ...overrides,
  };
}

describe("catalog quality engine", () => {
  it("scores factual completeness independently from commercial availability", () => {
    const complete = assessWineQuality(makeWine());
    const noOffer = assessWineQuality(
      makeWine({ affiliateLinks: [], hasQualifiedProfitshareOffer: false, priceAvg: null }),
    );
    expect(complete.status).toBe("complete");
    expect(noOffer.factualScore).toBe(complete.factualScore);
    expect(noOffer.commercial.priceCoverage).toBe("unavailable");
  });

  it("does not count sensory keywords without structured claim evidence", () => {
    const keywordOnly = assessWineQuality(
      makeWine({
        claimFields: [],
        tastingNotes:
          "Culoare: galben. Miros: soc. Gust: echilibrat. Temperatura de servire: 7-8°C.",
      }),
    );
    const sensory = keywordOnly.categories.find((item) => item.category === "sensory")!;
    const serving = keywordOnly.categories.find((item) => item.category === "serving")!;
    expect(sensory.present).toBe(0);
    expect(sensory.percent).toBe(0);
    expect(serving.present).toBe(0);
    expect(keywordOnly.status).not.toBe("complete");

    const structured = assessWineQuality(makeWine());
    expect(
      structured.categories.find((item) => item.category === "sensory")?.percent,
    ).toBe(100);
  });

  it("detects Demisec/Demidulce mixing and vintage mismatch", () => {
    const assessment = assessWineQuality(
      makeWine({
        slug: "zestrea-muscat-ottonel-demisec-2023-0-75l",
        name: "Zestrea Muscat Ottonel Demisec 2023 0.75L",
        tastingNotes: "Miros de demidulce, soc. Temperatura de servire: 7-8°C.",
      }),
    );
    expect(assessment.gates.map((gate) => gate.code)).toEqual(
      expect.arrayContaining(["SWEETNESS_MIXING", "VINTAGE_MISMATCH"]),
    );
  });

  it("detects conflicting alcohol and non-qualifying public price", () => {
    const assessment = assessWineQuality(
      makeWine({
        currentPrice: 65,
        hasQualifiedProfitshareOffer: false,
        tastingNotes: "Alcool 13.5% vol. Miros de soc. Temperatura de servire: 7-8°C.",
      }),
    );
    expect(assessment.gates.map((gate) => gate.code)).toEqual(
      expect.arrayContaining(["ALCOHOL_CONFLICT", "NON_PROFITSHARE_PRICE_EXPOSURE"]),
    );
  });

  it("detects duplicates across volume and sweetness variants without merging", () => {
    const report = runCatalogQualityAudit([
      makeWine({ id: 1, name: "Zestrea Muscat Ottonel Demisec 0.75L" }),
      makeWine({ id: 2, name: "Zestrea Muscat Ottonel Demisec 1.5L", volumeMl: 1500 }),
    ]);
    expect(report.duplicateGroups).toHaveLength(1);
    expect(report.summary.potentialDuplicates).toBe(1);
    expect(report.assessments.every((item) =>
      item.gates.some((gate) => gate.code === "DUPLICATE_WINE"),
    )).toBe(true);
  });

  it("does not penalize serving temperature when it is not in the source", () => {
    const withoutTemp = assessWineQuality(
      makeWine({
        tastingNotes: "Miros de soc. Gust echilibrat.",
        servingTemperature: null,
        claimFields: makeWine().claimFields.filter(
          (field) => field !== "serving_temperature",
        ),
      }),
    );
    const serving = withoutTemp.categories.find((item) => item.category === "serving")!;
    expect(serving.applicable).toBe(0);
    expect(withoutTemp.gates.map((gate) => gate.code)).not.toContain(
      "MISSING_PUBLIC_SERVING_TEMP",
    );
  });

  it("flags unattributed sensory claims and generic AI prose", () => {
    const assessment = assessWineQuality(
      makeWine({
        sourceUrl: null,
        producerPageUrl: null,
        tastingNotes: "De obicei vinurile albe au miros de soc.",
      }),
    );
    expect(assessment.gates.map((gate) => gate.code)).toEqual(
      expect.arrayContaining(["UNATTRIBUTED_TASTING_CLAIM", "GENERIC_AI_FACT"]),
    );
  });

  it("flags a bottle image whose variant conflicts with the wine", () => {
    const assessment = assessWineQuality(
      makeWine({ imageUrl: "https://example.com/zestrea-rosu-demidulce.webp" }),
    );
    expect(assessment.gates.map((gate) => gate.code)).toContain("WRONG_BOTTLE_PHOTO");
  });

  it("builds a prioritized repair queue", () => {
    const report = runCatalogQualityAudit([makeWine({ sourceUrl: null, alcohol: null })]);
    expect(report.retryQueue.length).toBeGreaterThan(0);
    expect(report.retryQueue[0]?.priority).toBe("P1");
    expect(report.assessments[0]?.sourceGaps.length).toBeGreaterThan(0);
  });

  it("does not repeatedly query a blocked or cooling-down source", () => {
    const cache = new SourceAttemptCache();
    cache.record({
      sourceUrl: "https://producer.example/tech",
      field: "alcohol",
      status: "blocked",
      reason: "robots",
    });
    expect(cache.shouldAttempt("https://producer.example/tech", "alcohol")).toBe(false);
    const plan = planSourceGaps(
      [{ field: "alcohol", preferredSources: ["https://producer.example/tech"], reason: "missing" }],
      { attempted: cache },
    );
    expect(plan[0]?.retryAllowed).toBe(false);
  });
});

describe("quality benchmark", () => {
  function answerSet(
    label: string,
    kind: BenchmarkAnswerSet["provenance"]["kind"],
    answer: BenchmarkAnswer,
  ): BenchmarkAnswerSet {
    return {
      label,
      provenance: { kind, notes: "test answer set" },
      answers: Object.fromEntries(
        BENCHMARK_QUESTIONS.map((question) => [question.id, answer]),
      ),
    };
  }

  it("does not let a longer unsupported answer win", () => {
    const result = evaluateBenchmark({
      vinintel: answerSet("VinIntel", "vinintel", {
        text: "Vin alb demisec, Muscat Ottonel, 7-8°C, DOC Murfatlar.",
        citations: ["https://murfatlar-vinul.ro/zestrea/"],
        supportedFields: [
          "wine_color",
          "sweetness",
          "grape_varieties",
          "serving_temperature",
          "region",
          "country",
          "appellation",
          "taste_descriptors",
          "food_pairing",
          "verification",
          "commercial",
        ],
        unsupportedAssertions: [],
      }),
      baseline: answerSet("Fixture baseline", "fixture", {
        text: "A very long generic answer with 13.5% alcohol, gold medals and orange blossom.",
        citations: [],
        supportedFields: ["wine_color", "sweetness", "grape_varieties"],
        unsupportedAssertions: ["13.5% alcohol", "gold medals", "orange blossom"],
      }),
    });
    expect(result.vinintelTotal).toBeGreaterThan(result.baselineTotal);
    expect(result.cases[0]?.baseline.unsupportedPenalty).toBe(45);
    expect(result.baselineLabel).toBe("Fixture baseline");
    expect(result.baselineKind).toBe("fixture");
  });
});

describe("quality release gate", () => {
  const input = {
    targetVariantKey: "zestrea-muscat-ottonel-alb-demisec-750ml",
    expectedVariantKey: "zestrea-muscat-ottonel-alb-demisec-750ml",
    claims: [
      {
        wineId: 418,
        canonicalIdentityKey: "x",
        identity: {
          producer: "Murfatlar",
          range: "Zestrea",
          productName: "Muscat Ottonel",
          grapeVarieties: ["Muscat Ottonel"],
          color: "alb" as const,
          sweetness: "demisec",
          bottleSizeMl: 750,
          vintage: null,
          sourceProductId: null,
        },
        field: "alcohol" as const,
        value: 12.5,
        normalizedValue: "12.5",
        unit: "% vol",
        sourceUrl: "https://auchan.ro/wine",
        sourceTitle: "Auchan",
        sourceClass: "retailer" as const,
        excerpt: "12,5% vol.",
        observedAt: new Date().toISOString(),
        extractionMethod: "deterministic" as const,
        identityMatchStatus: "EXACT_WINE_UNDATED_SOURCE" as const,
        confidence: 0.7,
        sourceHash: "s",
        claimHash: "c",
      },
    ],
    completeness: {
      wineId: 418,
      scorePercent: 100,
      presentCount: 15,
      requiredCount: 15,
      missingFields: [],
      unverifiedFields: [],
      fields: [],
      byGroup: {},
    },
    jsonLd: JSON.stringify({ "@type": "Product", name: "Zestrea" }),
    roUnavailableLabel: "Pret indisponibil",
    enUnavailableLabel: "Price unavailable",
    hasQualifiedProfitshareOffer: false,
  };

  it("passes the clean target gate", () => {
    expect(runQualityReleaseGate(input).passed).toBe(true);
  });

  it("fails catalog-wide when a non-qualified public price or identity conflict is present", () => {
    const result = runQualityReleaseGate({
      ...input,
      catalog: [
        {
          wineId: 1,
          wineName: "Safe wine",
          hasQualifiedProfitshareOffer: false,
          publicPrice: null,
          exactIdentity: true,
        },
        {
          wineId: 2,
          wineName: "Leaky wine",
          hasQualifiedProfitshareOffer: false,
          publicPrice: 50,
          exactIdentity: false,
        },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === "catalog-profitshare-safety")?.status).toBe(
      "FAIL",
    );
    expect(result.checks.find((check) => check.id === "catalog-identity-safety")?.status).toBe(
      "FAIL",
    );
  });

  it("fails on non-Profitshare price leakage and missing facts", () => {
    const result = runQualityReleaseGate({
      ...input,
      claims: [],
      jsonLd: JSON.stringify({ "@type": "Product", offers: { price: 50 } }),
      completeness: { ...input.completeness, scorePercent: 40 },
    });
    expect(result.passed).toBe(false);
    expect(result.checks.filter((check) => check.status === "FAIL").length).toBeGreaterThanOrEqual(3);
  });
});
