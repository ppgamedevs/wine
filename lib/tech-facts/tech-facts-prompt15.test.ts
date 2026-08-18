import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildPublicWineSpecs,
  formatPublicTechnicalValue,
} from "@/lib/tech-facts/public-trust-display";
import { GOLDEN_CURATION_STATS } from "@/lib/pairing/golden-curation-dataset";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import {
  publicTechStatusLabel,
  resolvePublicTechnicalTrust,
  type PublicTrustEvidenceInput,
  type PublicTrustWineInput,
} from "@/lib/tech-facts/public-trust";
import { buildWineProsCons } from "@/lib/wine-analysis";
import { buildWineJsonLd } from "@/lib/wine-json-ld";
import type { WineWithRelations } from "@/types";

const BASE_TECH_WINE: PublicTrustWineInput = {
  alcohol: 13.5,
  acidity: 5.4,
  sugar: null,
  sweetness: "sec",
  vintage: 2024,
};

function evidence(
  overrides: Partial<PublicTrustEvidenceInput> = {},
): PublicTrustEvidenceInput {
  return {
    field: "alcohol",
    valueJson: 13.5,
    sourceUrl: "https://producer.example/wine-2024",
    sourceType: "producer_page",
    sourceWineName: "Vin Test",
    sourceVintage: 2024,
    sourceDocumentTitle: "Vin Test 2024",
    excerpt: "Alcool 13,5% vol.",
    extractionMethod: "deterministic",
    identityMatchClass: "EXACT_WINE_EXACT_VINTAGE",
    observedAt: "2026-08-18T08:00:00.000Z",
    sourceHash: "a".repeat(64),
    ...overrides,
  };
}

function wineFixture(
  overrides: Partial<WineWithRelations> = {},
): WineWithRelations {
  return {
    id: 1,
    slug: "vin-test-2024",
    name: "Vin Test",
    type: "red",
    alcohol: 13.5,
    acidity: 5.4,
    sugar: null,
    sweetness: "sec",
    vintage: 2024,
    grapeVarieties: [],
    foodPairings: [],
    dessertPairings: [],
    foodPairingNotes: [],
    recommendedOccasions: [],
    thingsYouShouldKnow: [],
    availability: [],
    affiliateLinks: [],
    medals: [],
    priceHistory: [],
    winery: null,
    region: null,
    status: "verified",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  } as WineWithRelations;
}

describe("Prompt 15 public technical trust", () => {
  it("A: exact official matching evidence is verified", () => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, [evidence()]);
    expect(trust.fields.alcohol.status).toBe("verified");
    expect(trust.fields.alcohol.value).toBe(13.5);
    expect(formatPublicTechnicalValue(trust.fields.alcohol)).toBe(
      "13,5% vol.",
    );
  });

  it("A-C UI examples format Recas acidity and Gabai sweetness", () => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, [
      evidence({
        field: "acidity",
        valueJson: 5.4,
        sourceUrl: "https://producer.example/recas-sheet.pdf",
        sourceType: "tasting_sheet",
        excerpt: "Aciditate 5,4 g/L",
      }),
      evidence({
        field: "sweetness",
        valueJson: "sec",
        sourceUrl: "https://producer.example/gabai-wine",
        excerpt: "Clasificare Sec",
        sourceHash: "b".repeat(64),
      }),
    ]);
    expect(formatPublicTechnicalValue(trust.fields.acidity)).toBe("5,4 g/L");
    expect(formatPublicTechnicalValue(trust.fields.sweetness)).toBe("Sec");
    expect(trust.sources.map((source) => source.label)).toContain(
      "Fișa tehnică a producătorului",
    );
  });

  it("B/R: two distinct official URLs produce sourceCount 2", () => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, [
      evidence(),
      evidence({
        sourceUrl: "https://producer.example/sheet.pdf",
        sourceType: "tasting_sheet",
        sourceHash: "b".repeat(64),
      }),
    ]);
    expect(trust.fields.alcohol.status).toBe("verified");
    expect(trust.fields.alcohol.sourceCount).toBe(2);
  });

  it.each([
    { extractionMethod: "legacy_producer_fact" as const },
    { sourceType: "retailer" },
    { sourceType: "marketplace" },
  ])("C-E: non-public evidence stays catalog-only", (override) => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, [
      evidence(override),
    ]);
    expect(trust.fields.alcohol.status).toBe("catalog_only");
  });

  it("F: contradictory exact evidence wins and hides the value", () => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, [
      evidence(),
      evidence({
        valueJson: 14,
        sourceUrl: "https://producer.example/conflict",
        sourceHash: "c".repeat(64),
      }),
    ]);
    expect(trust.fields.alcohol.status).toBe("conflict");
    expect(trust.fields.alcohol.value).toBeNull();
    expect(formatPublicTechnicalValue(trust.fields.alcohol)).toBe(
      "În verificare",
    );
  });

  it("G: conflict is omitted from structured data", () => {
    const wine = wineFixture();
    const trust = resolvePublicTechnicalTrust(wine, [
      evidence({ valueJson: 14 }),
    ]);
    const wineSchema = buildWineJsonLd(wine, [], trust)[0]!;
    expect(wineSchema).not.toHaveProperty("alcoholContent");
  });

  it("H: stored value without evidence is catalog-only", () => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, []);
    expect(trust.fields.alcohol.status).toBe("catalog_only");
    expect(trust.fields.alcohol.value).toBe(13.5);
  });

  it("I/J: null optional field is unknown and omitted from specs", () => {
    const wine = wineFixture({ sugar: null });
    const trust = resolvePublicTechnicalTrust(wine, []);
    expect(trust.fields.sugar.status).toBe("unknown");
    expect(buildPublicWineSpecs(wine, trust).technical).not.toContainEqual(
      expect.objectContaining({ label: "Zahăr rezidual" }),
    );
  });

  it("K: catalog-only table value includes its warning", () => {
    const wine = wineFixture();
    const trust = resolvePublicTechnicalTrust(wine, []);
    expect(
      formatPublicTechnicalValue(trust.fields.alcohol),
    ).toBe("13,5% vol.");
    expect(publicTechStatusLabel(trust.fields.alcohol)).toBe(
      "Sursă oficială neconfirmată",
    );
    expect(readFileSync(
      "components/wines/wine-specs-table.tsx",
      "utf8",
    )).toContain("publicTechStatusLabel(field)");
  });

  it("L/P: catalog-only alcohol and vintage are omitted from JSON-LD", () => {
    const wine = wineFixture();
    const trust = resolvePublicTechnicalTrust(wine, []);
    const wineSchema = buildWineJsonLd(wine, [], trust)[0]!;
    expect(wineSchema).not.toHaveProperty("alcoholContent");
    expect(wineSchema).not.toHaveProperty("vintage");
  });

  it("M: catalog-only alcohol cannot create derived pros/cons", () => {
    const wine = wineFixture({ alcohol: 15 });
    const trust = resolvePublicTechnicalTrust(wine, []);
    const result = buildWineProsCons(wine, trust);
    expect(result.cons.join(" ")).not.toContain("Alcool 15");
  });

  it("N: verified alcohol may create derived pros/cons", () => {
    const wine = wineFixture({ alcohol: 15 });
    const trust = resolvePublicTechnicalTrust(wine, [
      evidence({ valueJson: 15 }),
    ]);
    const result = buildWineProsCons(wine, trust);
    expect(result.cons.join(" ")).toContain("Alcool 15%");
  });

  it("O: verified vintage may be emitted in Wine JSON-LD", () => {
    const wine = wineFixture();
    const trust = resolvePublicTechnicalTrust(wine, [
      evidence({
        field: "vintage",
        valueJson: 2024,
        excerpt: "Recolta 2024",
      }),
    ]);
    expect(buildWineJsonLd(wine, [], trust)[0]).toHaveProperty(
      "vintage",
      "2024",
    );
    expect(buildWineJsonLd(wine, [], trust).map((schema) => schema["@type"])).toEqual(
      ["Wine", "Product", "FAQPage", "BreadcrumbList"],
    );
  });

  it("Q: duplicate evidence rows from one URL count as one source", () => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, [
      evidence(),
      evidence({
        observedAt: "2026-08-19T08:00:00.000Z",
        sourceHash: "b".repeat(64),
      }),
    ]);
    expect(trust.fields.alcohol.sourceCount).toBe(1);
  });

  it("S/T: latest evidence observedAt is the verification date", () => {
    const trust = resolvePublicTechnicalTrust(BASE_TECH_WINE, [
      evidence({ observedAt: "2026-08-17T08:00:00.000Z" }),
      evidence({
        observedAt: "2026-08-19T08:00:00.000Z",
        sourceHash: "b".repeat(64),
      }),
    ]);
    expect(trust.fields.alcohol.verifiedAt).toBe(
      "2026-08-19T08:00:00.000Z",
    );
    expect(trust.fields.alcohol.verifiedAt).not.toBe(
      wineFixture().updatedAt,
    );
  });

  it("U: a tastingSheetUrl without persisted evidence is never public proof", () => {
    const wine = wineFixture({
      tastingSheetUrl: "https://avincis.ro/privacy-policy.pdf",
    });
    const trust = resolvePublicTechnicalTrust(wine, []);
    expect(trust.fields.alcohol.status).toBe("catalog_only");
    expect(trust.sources).toHaveLength(0);
  });

  it("V: public detail trust code has no recovery, external fetch, or LLM call", () => {
    const page = readFileSync("app/wines/[slug]/page.tsx", "utf8");
    const query = readFileSync(
      "lib/tech-facts/public-trust-query.ts",
      "utf8",
    );
    expect(`${page}\n${query}`).not.toMatch(
      /fetchOfficialSources|recoverWineWithSources|generateObject|generateText|fetch\(/,
    );
  });

  it("V2: targeted public derived paths do not bypass trust", () => {
    const specs = readFileSync(
      "components/wines/wine-specs-table.tsx",
      "utf8",
    );
    const analysis = readFileSync("lib/wine-analysis.ts", "utf8");
    const pairings = readFileSync(
      "components/wines/wine-pairings.tsx",
      "utf8",
    );
    const jsonLd = readFileSync("lib/wine-json-ld.ts", "utf8");
    const topList = readFileSync(
      "components/top-lists/top-list-wine-verdict.tsx",
      "utf8",
    );
    expect(specs).not.toMatch(
      /wine\.(alcohol|acidity|sugar|sweetness)/,
    );
    expect(analysis).not.toContain("wine.alcohol");
    expect(pairings).not.toContain("sweetness: wine.sweetness");
    expect(jsonLd).not.toContain("alcoholContent: wine.alcohol");
    expect(topList).not.toContain("wine.alcohol");
  });

  it("W/X: disclosure is accessible and mobile rows wrap", () => {
    const source = readFileSync(
      "components/wines/wine-specs-table.tsx",
      "utf8",
    );
    expect(source).toContain("<details");
    expect(source).toContain("<summary");
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
    expect(source).toContain("într-o filă nouă");
    expect(source).toContain("whitespace-normal");
    expect(source).toContain("sm:table-row");
  });

  it("Y: golden dataset stays at 30 wines and 102 pairings", () => {
    expect(GOLDEN_CURATION_STATS.wines).toBe(30);
    expect(GOLDEN_CURATION_STATS.pairings).toBe(102);
  });

  it("Z: resolving public trust does not mutate stored scores", () => {
    const wine = wineFixture({
      valueScore: 81,
      giftScore: 72,
      foodMatchScore: 76,
    });
    const before = {
      valueScore: wine.valueScore,
      giftScore: wine.giftScore,
      foodMatchScore: wine.foodMatchScore,
    };
    resolvePublicTechnicalTrust(wine, [evidence()]);
    expect({
      valueScore: wine.valueScore,
      giftScore: wine.giftScore,
      foodMatchScore: wine.foodMatchScore,
    }).toEqual(before);
  });

  it("AA: secondary scoring remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
  });
});
