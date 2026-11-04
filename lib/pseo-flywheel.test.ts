import { describe, expect, it } from "vitest";
import {
  analyzeQuestion,
  buildGroundedDraft,
  clusterQuestionIntents,
  draftSlug,
  evaluateQualityGates,
  type IntentCluster,
} from "@/lib/pseo-flywheel";
import type { WineWithRelations } from "@/types";

function wine(
  id: number,
  slug: string,
  name: string,
  type: "red" | "white",
  grape: string,
  region: string,
): WineWithRelations {
  return {
    id,
    slug,
    name,
    type,
    vintage: 2021,
    sweetness: "sec",
    grapeVarieties: [{ name: grape }],
    foodPairings: [],
    foodPairingNotes: [],
    dessertPairings: [],
    producerContent: null,
    medals: [],
    expertNotes: null,
    alcohol: type === "red" ? 13.5 : 12.2,
    acidity: type === "red" ? 6.4 : 7.4,
    priceAvg: 80,
    cellarPotential: 5,
    winery: { name: "Crama Test", slug: "crama-test" },
    region: { name: region, slug: region.toLowerCase().replace(/\s+/g, "-") },
    tastingNotes:
      type === "red"
        ? "Cireasa acra, prune, ierburi, piper, tanin ferm, baric discret."
        : "Mar verde, lime, flori albe, aciditate vie, final mineral.",
  } as unknown as WineWithRelations;
}

const WINES: WineWithRelations[] = [
  wine(1, "feteasca-neagra-test", "Feteasca Neagra Test 2021", "red", "Feteasca Neagra", "Dealu Mare"),
  wine(2, "cadarca-test", "Cadarca Test 2020", "red", "Cadarca", "Minis"),
  wine(3, "negru-test", "Negru de Dragasani Test 2021", "red", "Negru de Dragasani", "Dragasani"),
  wine(4, "regala-test", "Feteasca Regala Test 2022", "white", "Feteasca Regala", "Dragasani"),
];

function clusterFor(rawQueries: string[]): IntentCluster {
  const records = rawQueries.map((rawQuery, index) =>
    Object.assign(
      analyzeQuestion({
        rawQuery,
        language: rawQuery.includes("vin") ? "ro" : "en",
        answerQuality: "high",
      }),
      { id: index + 1 },
    ),
  );
  return clusterQuestionIntents(records)[0];
}

describe("PSEO question flywheel", () => {
  it("clusters paraphrases into one canonical intent", () => {
    const cluster = clusterFor([
      "Romanian wine similar to Chianti",
      "closest Romanian equivalent to Chianti",
      "what Romanian wine if I like Sangiovese",
    ]);
    expect(cluster.key).toBe("romanian_equivalent:chianti");
    expect(cluster.demandCount).toBe(3);
    expect(cluster.uniqueDemandCount).toBe(3);
    // Sangiovese and Chianti share a canonical style cluster, while the
    // reference names remain in the logged entities for transparency.
    expect(cluster.referenceName).toBe("Chianti");
  });

  it("uses page-type-aware clusters for sparkling and lovers queries", () => {
    const prosecco = analyzeQuestion({
      rawQuery: "Best Romanian alternatives to Prosecco",
      language: "en",
      answerQuality: "high",
    });
    const lovers = analyzeQuestion({
      rawQuery: "Romanian wines for Sauvignon Blanc lovers",
      language: "en",
      answerQuality: "high",
    });
    expect(prosecco.pageType).toBe("romanian_alternative");
    expect(prosecco.topicCluster).toBe("romanian_alternative:prosecco");
    expect(lovers.pageType).toBe("romanian_wines_for_lovers");
    expect(lovers.referenceName).toBe("Sauvignon Blanc");
  });

  it("blocks nonsense and unsupported questions from page creation", () => {
    expect(
      analyzeQuestion({
        rawQuery: "What Romanian wine is closest to dolphin?",
        language: "en",
        answerQuality: "high",
      }).blocked,
    ).toBe(true);
    expect(
      analyzeQuestion({
        rawQuery: "What wine should I drink tonight?",
        language: "en",
        answerQuality: "high",
      }).blocked,
    ).toBe(true);
  });

  it("rejects a cluster with insufficient repeated demand", () => {
    const cluster = clusterFor([
      "Romanian wine similar to Chianti",
      "Romanian wine similar to Chianti?",
    ]);
    const gate = evaluateQualityGates({
      cluster,
      supportingWineCount: 4,
      coverage: 0.8,
      confidence: 0.85,
      duplicationRisk: 0.1,
    });
    expect(gate.passed).toBe(false);
    expect(gate.checks.find((check) => check.code === "repeated_demand")?.passed).toBe(
      false,
    );
    expect(gate.publishRecommendation).toBe("reject");
  });

  it("passes a high-demand, well-supported cluster and recommends publish", () => {
    const cluster = clusterFor([
      "Romanian wine similar to Chianti",
      "closest Romanian equivalent to Chianti",
      "what Romanian wine if I like Chianti",
    ]);
    const gate = evaluateQualityGates({
      cluster,
      supportingWineCount: 4,
      coverage: 0.82,
      confidence: 0.86,
      duplicationRisk: 0.1,
    });
    expect(gate.passed).toBe(true);
    expect(gate.publishRecommendation).toBe("publish");
  });

  it("blocks a duplicate-risk cluster", () => {
    const cluster = clusterFor([
      "Romanian wine similar to Chianti",
      "closest Romanian equivalent to Chianti",
      "what Romanian wine if I like Chianti",
    ]);
    const gate = evaluateQualityGates({
      cluster,
      supportingWineCount: 4,
      coverage: 0.82,
      confidence: 0.86,
      duplicationRisk: 0.8,
    });
    expect(gate.passed).toBe(false);
    expect(gate.publishRecommendation).toBe("reject");
  });

  it("generates a grounded noindex draft, not an AI paraphrase", () => {
    const cluster = clusterFor([
      "Romanian wine similar to Chianti",
      "closest Romanian equivalent to Chianti",
      "what Romanian wine if I like Chianti",
    ]);
    const result = buildGroundedDraft({ cluster, wines: WINES, locale: "en" });
    expect(result).not.toBeNull();
    expect(result!.gate.passed).toBe(true);
    expect(result!.draft).not.toBeNull();
    const draft = result!.draft!;
    expect(draft.status).toBe("draft");
    expect(draft.noindexUntilApproved).toBe(true);
    expect(draft.supportingWineCount).toBeGreaterThanOrEqual(3);
    expect(draft.contentMarkdown).toContain("Chianti");
    expect(draft.contentMarkdown).toContain("Facts:");
    expect(draft.contentMarkdown).toContain("not a copy");
    expect(draft.contentMarkdown).not.toMatch(/[\u2013\u2014]/);
    expect(draft.faq.length).toBeGreaterThanOrEqual(3);
  });

  it("uses locale-specific slugs", () => {
    const reference = analyzeQuestion({
      rawQuery: "Romanian wine similar to Chianti",
      language: "en",
    });
    expect(reference.referenceId).toBe("chianti");
    const draft = buildGroundedDraft({
      cluster: clusterFor([
        "Romanian wine similar to Chianti",
        "closest Romanian equivalent to Chianti",
        "what Romanian wine if I like Chianti",
      ]),
      wines: WINES,
      locale: "en",
    });
    expect(draft!.draft!.slug).toContain("romanian-wine-similar-to-chianti");
    expect(draftSlug(STYLE_REFERENCE_CHIANTI, "romanian_equivalent", "ro")).toContain(
      "vin-romanesc-asemanator",
    );
  });

  it("does not generate a draft when the gate fails", () => {
    const cluster = clusterFor([
      "Romanian wine similar to Chianti",
      "closest Romanian equivalent to Chianti",
    ]);
    const result = buildGroundedDraft({ cluster, wines: WINES, locale: "ro" });
    expect(result?.gate.passed).toBe(false);
    expect(result?.draft).toBeNull();
  });
});

const STYLE_REFERENCE_CHIANTI = {
  id: "chianti",
  name: "Chianti",
  aliases: ["chianti"],
  origin: { region: "Tuscany", country: "Italy" },
  color: "red" as const,
  body: 2,
  acidity: 4,
  tannin: 3,
  alcohol: 2,
  sweetness: 0,
  aromatic: [],
  oak: 1,
  freshness: 4,
  ageability: 3,
  food: [],
  climate: [],
};
