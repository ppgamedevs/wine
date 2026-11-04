import { describe, expect, it } from "vitest";
import {
  findClosestRomanianWines,
  formatComparisonAnswer,
  formatComparisonContext,
  parseComparisonIntent,
} from "@/lib/sommelier-comparison";
import type { WineWithRelations } from "@/types";

function wine(overrides: Record<string, unknown> & { slug: string; name: string }): WineWithRelations {
  return {
    id: 1,
    type: "red",
    vintage: 2021,
    sweetness: "sec",
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    foodPairings: [],
    foodPairingNotes: [],
    dessertPairings: [],
    producerContent: null,
    medals: [],
    expertNotes: null,
    alcohol: 13.5,
    acidity: 6.2,
    priceAvg: 80,
    cellarPotential: 5,
    winery: { name: "Crama Test", slug: "crama-test" },
    region: { name: "Dealu Mare", slug: "dealu-mare" },
    ...overrides,
  } as unknown as WineWithRelations;
}

const WINES: WineWithRelations[] = [
  wine({
    id: 1,
    slug: "feteasca-neagra-dealu-mare-2021",
    name: "Feteasca Neagra Dealu Mare 2021",
    type: "red",
    vintage: 2021,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    alcohol: 13.8,
    acidity: 6.4,
    tastingNotes: "Cireasa acra, prune, ierburi, piper, tanin ferm, baric discret.",
    tasteProfile: "Corp mediu, aciditate vie, tanin ferm.",
  }),
  wine({
    id: 2,
    slug: "cadarca-minis-2020",
    name: "Cadarca Minis 2020",
    type: "red",
    vintage: 2020,
    grapeVarieties: [{ name: "Cadarca" }],
    alcohol: 13.2,
    acidity: 6.8,
    tastingNotes: "Cireasa acra, prune, piper, condimente, tanin ferm.",
    region: { name: "Minis", slug: "minis" },
  }),
  wine({
    id: 7,
    slug: "cadarca-minis-2019",
    name: "Cadarca Minis 2019",
    type: "red",
    vintage: 2019,
    grapeVarieties: [{ name: "Cadarca" }],
    alcohol: 13.4,
    acidity: 6.6,
    tastingNotes: "Cireasa acra, prune, piper, tanin ferm.",
    region: { name: "Minis", slug: "minis" },
  }),
  wine({
    id: 6,
    slug: "negru-de-dragasani-2021",
    name: "Negru de Dragasani 2021",
    type: "red",
    vintage: 2021,
    grapeVarieties: [{ name: "Negru de Dragasani" }],
    alcohol: 14,
    acidity: 6.1,
    tastingNotes: "Cireasa neagra, mure, piper, tanin ferm.",
    region: { name: "Dragasani", slug: "dragasani" },
  }),
  wine({
    id: 3,
    slug: "feteasca-regala-dragasani-2022",
    name: "Feteasca Regala Dragasani 2022",
    type: "white",
    vintage: 2022,
    grapeVarieties: [{ name: "Feteasca Regala" }],
    alcohol: 12.1,
    acidity: 7.2,
    tastingNotes: "Mar verde, lime, flori albe, aciditate vie.",
    region: { name: "Dragasani", slug: "dragasani" },
  }),
  wine({
    id: 4,
    slug: "mustoasa-de-maderat-2023",
    name: "Mustoasa de Maderat 2023",
    type: "white",
    vintage: 2023,
    grapeVarieties: [{ name: "Mustoasa de Maderat" }],
    alcohol: 11.8,
    acidity: 8,
    tastingNotes: "Coaja de lamaie, mar verde, ierburi, piatra umeda, final sarat.",
    region: { name: "Minis-Maderat", slug: "minis-maderat" },
  }),
  wine({
    id: 5,
    slug: "grasa-de-cotnari-2020",
    name: "Grasa de Cotnari 2020",
    type: "white",
    vintage: 2020,
    grapeVarieties: [{ name: "Grasa de Cotnari" }],
    alcohol: 12.8,
    acidity: 5.8,
    sweetness: "demisec",
    tastingNotes: "Cais, miere, gutui, flori albe.",
    region: { name: "Cotnari", slug: "cotnari" },
  }),
];

describe("Romanian sommelier comparison engine", () => {
  it("detects a false Chianti origin premise without dropping the style request", () => {
    const intent = parseComparisonIntent(
      "What Romanian wine is closest to Chianti from Sicily 2007?",
    );
    expect(intent).not.toBeNull();
    expect(intent?.referenceName).toBe("Chianti");
    expect(intent?.claimedOrigin).toBe("Sicily");
    expect(intent?.claimedVintage).toBe(2007);
    expect(intent?.premiseIssues.join(" ")).toContain("Tuscany");
    expect(intent?.premiseIssues.join(" ")).toContain("Sicily");
  });

  it("finds Romanian reds for a Chianti style and returns alternatives", () => {
    const intent = parseComparisonIntent("What Romanian wine is closest to Chianti?");
    const result = findClosestRomanianWines({ intent: intent!, wines: WINES });
    expect(result).not.toBeNull();
    expect(result!.best.wine.type).toBe("red");
    expect(result!.alternatives.length).toBeGreaterThanOrEqual(2);
    expect(result!.alternatives.length).toBeLessThanOrEqual(3);
    expect(result!.best.reasons.length).toBeGreaterThan(0);
    expect(result!.best.differences.length).toBeGreaterThan(0);
    expect(result!.best.evidence.confirmed.join(" ")).toContain("colour=red");
    expect(result!.best.score).toBeGreaterThan(40);
    expect(result!.best.familyLinks.length).toBeGreaterThan(0);
  });

  it("maps Sangiovese to a Romanian red without inventing a Sangiovese bottle", () => {
    const intent = parseComparisonIntent(
      "I like Sangiovese. What Romanian wine should I try?",
    );
    const result = findClosestRomanianWines({ intent: intent!, wines: WINES });
    expect(result!.best.wine.type).toBe("red");
    expect(result!.best.wine.grapeVarieties.map((grape) => grape.name)).not.toContain(
      "Sangiovese",
    );
    expect(result!.best.evidence.references).toContain(
      `vinintel:wine:${result!.best.wine.slug}`,
    );
  });

  it("maps dry Riesling to a white Romanian match", () => {
    const intent = parseComparisonIntent(
      "If I enjoy dry Riesling, what Romanian wine is the nearest equivalent?",
    );
    const result = findClosestRomanianWines({ intent: intent!, wines: WINES });
    expect(result!.best.wine.type).toBe("white");
    expect(["feteasca-regala-dragasani-2022", "mustoasa-de-maderat-2023"]).toContain(
      result!.best.wine.slug,
    );
  });

  it("keeps confirmed, interpreted and missing evidence separate", () => {
    const intent = parseComparisonIntent("What Romanian wine is closest to Chianti?");
    const result = findClosestRomanianWines({ intent: intent!, wines: WINES });
    const answer = formatComparisonAnswer(result!, "en");
    expect(answer).toContain("Confirmed facts:");
    expect(answer).toContain("Interpretation:");
    expect(answer).toContain("Uncertainties:");
    expect(answer).not.toMatch(/[\u2013\u2014]/);
    expect(answer).toContain("I have not invented awards");
    const context = formatComparisonContext(result!, "ro");
    expect(context).toContain("ANALIZĂ STRUCTURATĂ");
    expect(context).toContain("Evidence:");
  });

  it("handles a vintage and region comparison without turning the year into a quality claim", () => {
    const intent = parseComparisonIntent(
      "Compare Feteasca Neagra 2021 from Dealu Mare with Chianti",
    );
    expect(intent).not.toBeNull();
    expect(intent?.claimedVintage).toBe(2021);
    const result = findClosestRomanianWines({ intent: intent!, wines: WINES });
    const context = formatComparisonContext(result!, "en");
    expect(context).toContain("Vintage mentioned: 2021");
    expect(context).toContain("Do not turn the year into a vintage assessment");
  });

  it("uses a supplied vintage signal without inventing a classification", () => {
    const intent = parseComparisonIntent("What Romanian wine is closest to Chianti?");
    const result = findClosestRomanianWines({
      intent: intent!,
      wines: WINES,
      vintageSignals: new Map([
        [
          "feteasca-neagra-dealu-mare-2021",
          {
            wineSlug: "feteasca-neagra-dealu-mare-2021",
            vintage: 2021,
            classification: "favorable",
            sourceUrl: "https://example.test/vintage",
            sourceTitle: "Vintage evidence fixture",
            confidence: 0.8,
          },
        ],
      ]),
    });
    const all = [result!.best, ...result!.alternatives];
    expect(
      all.some((match) =>
        match.evidence.confirmed.some((fact) =>
          fact.includes("vintage assessment=favorable"),
        ),
      ),
    ).toBe(true);
  });

  it("returns null when there is no eligible catalog wine", () => {
    const intent = parseComparisonIntent("What Romanian wine is closest to Chianti?");
    expect(findClosestRomanianWines({ intent: intent!, wines: [] })).toBeNull();
  });
});
