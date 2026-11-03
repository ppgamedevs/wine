import { describe, expect, it } from "vitest";
import {
  loadTargetSources,
  loadTargetWine,
  MURFATLAR_ZESTREA_URL,
} from "@/lib/intelligence/fixtures";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import { getVarietyKnowledge } from "@/lib/intelligence/variety-knowledge";
import {
  buildAiInterpretationPrompt,
  estimateAiCost,
  generateAiInterpretation,
  validateAiInterpretation,
} from "@/lib/intelligence/ai-enrichment";
import type { SourceFixture } from "@/lib/intelligence/types";
import { sourceMayContributePublicPrice } from "@/lib/intelligence/pricing-firewall";

const target = () =>
  runWineIntelligence({
    wine: loadTargetWine(),
    fixtures: loadTargetSources(),
    dryRun: true,
    now: "2026-11-03T13:00:00.000Z",
  });

describe("Multi-Source Wine Intelligence V2", () => {
  it("recovers the target from independent producer and retailer sources", async () => {
    const { report } = await target();
    const byField = new Map(report.reconciled.map((claim) => [claim.field, claim]));

    expect(report.sources.map((source) => source.source.classification)).toEqual(
      expect.arrayContaining([
        "official_producer_page",
        "retailer",
        "existing_record",
      ]),
    );
    expect(byField.get("producer")?.value).toBe("Murfatlar");
    expect(byField.get("grape_varieties")?.value).toEqual(["Muscat Ottonel"]);
    expect(byField.get("sweetness")?.value).toBe("demisec");
    expect(byField.get("bottle_volume")?.value).toBe(750);
    expect(byField.get("appellation")?.value).toBe("DOC - CMD Murfatlar");
    expect(byField.get("serving_temperature")?.value).toBe("7-8");
    expect(byField.get("alcohol")?.value).toBe(12.5);
    expect(byField.get("alcohol")?.verificationStatus).toBe("attributed_retailer");
    expect(byField.get("alcohol")?.sourceClass).toBe("retailer");
    expect(report.completeness.scorePercent).toBeGreaterThanOrEqual(90);
    expect(report.aiEstimate.requestCount).toBe(1);
    expect(report.aiEstimate.estimatedCostUsd).toBeLessThan(0.01);
    expect(sourceMayContributePublicPrice("retailer")).toBe(false);
    expect(sourceMayContributePublicPrice("official_producer_page")).toBe(false);
  });

  it("never leaks adjacent variant or general variety aromas into the target", async () => {
    const { report } = await target();
    const aroma = report.reconciled.find((claim) => claim.field === "aroma_descriptors");
    const taste = report.reconciled.find((claim) => claim.field === "taste_descriptors");
    const aromaText = JSON.stringify(aroma?.value ?? []);
    const tasteText = JSON.stringify(taste?.value ?? []);
    const variety = getVarietyKnowledge("Muscat Ottonel")!;

    expect(aromaText).not.toContain("soc și pere coapte");
    expect(aromaText).not.toContain("orange blossom");
    expect(tasteText).not.toContain("Temperatura");
    expect(tasteText).not.toContain("Asocierea");
    expect(variety.typicalAromas).toContain("orange blossom");
    expect(variety.typicalAromas).not.toContain("soc și pere coapte");
  });

  it("preserves a conflict while selecting official evidence over retailer evidence", async () => {
    const official: SourceFixture = {
      url: "https://producer.example/tech.pdf",
      title: "Official technical sheet",
      kind: "text",
      body: "Alcool 13% vol. Murfatlar Zestrea Muscat Ottonel Demisec 0.75L.",
      classification: "official_technical_sheet",
    };
    const retailer: SourceFixture = {
      url: "https://retailer.example/wine",
      title: "Retailer",
      kind: "json",
      body: JSON.stringify({
        title: "Zestrea Muscat Ottonel Demisec",
        alcoholPercent: 12.5,
        alcoholEvidence: "12,5% vol.",
      }),
      classification: "retailer",
    };
    const { report } = await runWineIntelligence({
      wine: { ...loadTargetWine(), producerPageUrl: null, sourceUrl: null },
      fixtures: [official, retailer],
      dryRun: true,
    });
    const alcohol = report.reconciled.find((claim) => claim.field === "alcohol")!;
    expect(alcohol.value).toBe(13);
    expect(alcohol.verificationStatus).toBe("conflict");
    expect(alcohol.conflict?.values).toHaveLength(2);
    expect(alcohol.conflict?.values.map((value) => value.value)).toEqual(
      expect.arrayContaining(["13", "12.5"]),
    );
    expect(report.errors).toEqual([]);
  });

  it("fails closed when two official sources disagree", async () => {
    const first: SourceFixture = {
      url: "https://a.producer.example/tech",
      title: "Official A",
      kind: "text",
      body: "Alcool 13% vol. Murfatlar Zestrea Muscat Ottonel Demisec 0.75L.",
      classification: "official_technical_sheet",
    };
    const second: SourceFixture = {
      url: "https://b.producer.example/tech",
      title: "Official B",
      kind: "text",
      body: "Alcool 13.5% vol. Murfatlar Zestrea Muscat Ottonel Demisec 0.75L.",
      classification: "official_technical_sheet",
    };
    const { report } = await runWineIntelligence({
      wine: { ...loadTargetWine(), producerPageUrl: null, sourceUrl: null },
      fixtures: [first, second],
      dryRun: true,
    });
    const alcohol = report.reconciled.find((claim) => claim.field === "alcohol")!;
    expect(alcohol.value).toBeNull();
    expect(alcohol.verificationStatus).toBe("conflict");
  });

  it("does not treat copied sources as independent corroboration", async () => {
    const body = "Alcool 13% vol. Murfatlar Zestrea Muscat Ottonel Demisec 0.75L.";
    const oneHost: SourceFixture[] = [
      {
        url: "https://producer.example/a",
        title: "A",
        kind: "text",
        body,
        classification: "official_technical_sheet",
      },
      {
        url: "https://producer.example/a-copy",
        title: "A copy",
        kind: "text",
        body,
        classification: "official_technical_sheet",
      },
    ];
    const copied = await runWineIntelligence({
      wine: { ...loadTargetWine(), producerPageUrl: null, sourceUrl: null },
      fixtures: oneHost,
      dryRun: true,
    });
    expect(
      copied.report.reconciled.find((claim) => claim.field === "alcohol")
        ?.verificationStatus,
    ).toBe("verified_official");

    const twoHosts = [
      oneHost[0]!,
      { ...oneHost[1]!, url: "https://other.producer.example/a" },
    ];
    const independent = await runWineIntelligence({
      wine: { ...loadTargetWine(), producerPageUrl: null, sourceUrl: null },
      fixtures: twoHosts,
      dryRun: true,
    });
    expect(
      independent.report.reconciled.find((claim) => claim.field === "alcohol")
        ?.verificationStatus,
    ).toBe("corroborated");
  });

  it("is idempotent for the same source fingerprint and never mutates on dry-run", async () => {
    const first = await target();
    const second = await target();
    expect(first.report.fingerprint).toBe(second.report.fingerprint);
    expect(first.report.runId).toBe(second.report.runId);
    expect(first.persisted).toBeNull();
    expect(first.report.mutationPlan.claimsToInsert).toBe(
      second.report.mutationPlan.claimsToInsert,
    );
    expect(first.report.beforeAfter.addedFields).toEqual(
      expect.arrayContaining(["alcohol", "appellation", "region"]),
    );
  });

  it("marks robots-restricted sources unavailable without fetching them", async () => {
    const blocked: SourceFixture = {
      url: "https://blocked.example/wine",
      title: "Blocked",
      kind: "json",
      body: "{}",
      classification: "retailer",
      robotsAllowed: false,
    };
    const { report } = await runWineIntelligence({
      wine: { ...loadTargetWine(), producerPageUrl: null, sourceUrl: null },
      fixtures: [blocked],
      dryRun: true,
    });
    expect(report.sources.find((source) => source.source.url === blocked.url)?.status).toBe(
      "blocked",
    );
    expect(report.requestCount).toBe(0);
  });

  it("rejects unsupported AI numbers and stores AI separately in the model", async () => {
    const { report } = await target();
    const rejected = validateAiInterpretation(
      "Vinul are 13.5% alcool și a câștigat o medalie de aur.",
      report.reconciled,
    );
    expect(rejected.valid).toBe(false);
    expect(rejected.reasons.join(" ")).toContain("Unsupported numeric");
    const genericAroma = validateAiInterpretation(
      "Un vin cu aromă de orange blossom.",
      report.reconciled,
      { forbiddenGenericAromas: ["orange blossom"] },
    );
    expect(genericAroma.valid).toBe(false);
    expect(genericAroma.reasons.join(" ")).toContain("General variety aroma");
    expect(buildAiInterpretationPrompt("Target", report.reconciled)).toContain(
      "never invent",
    );
    expect(estimateAiCost(report.reconciled).requestCount).toBe(1);
    expect(report.aiInterpretation).toBeNull();

    const accepted = await generateAiInterpretation({
      wineName: report.wineName,
      claims: report.reconciled,
      generator: async () => "Vinul are 12.5% alcool și un profil demisec.",
    });
    expect(accepted?.text).toContain("12.5%");
    await expect(
      generateAiInterpretation({
        wineName: report.wineName,
        claims: report.reconciled,
        generator: async () => "Vinul are 13.5% alcool.",
      }),
    ).rejects.toThrow("AI interpretation rejected");
  });

  it("keeps variety knowledge outside the bottle report", async () => {
    const { report } = await target();
    expect(report.claims.some((claim) => claim.field === "aroma_descriptors" &&
      JSON.stringify(claim.value).includes("orange blossom"))).toBe(false);
    expect(getVarietyKnowledge("Muscat Ottonel")?.regions.length).toBeGreaterThan(0);
    expect(MURFATLAR_ZESTREA_URL).toContain("murfatlar-vinul.ro");
  });
});
