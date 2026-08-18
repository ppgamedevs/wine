import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sommelier-rag", () => ({
  hybridRetrieve: vi.fn(),
}));
import {
  resolvePublicSecondaryScores,
  sanitizePublicSecondaryCopy,
} from "@/lib/scoring-v2/public-secondary-display";
import { setSecondaryScoringModeForTests } from "@/lib/scoring-v2/secondary-scoring-mode";
import {
  countSitemapRouteFamilies,
  flattenSitemapRouteFamilies,
  type SitemapRouteFamilies,
} from "@/lib/sitemap-validation";
import { buildChatSommelierSystemPrompt } from "@/lib/sommelier-chat";
import {
  buildWineContextBlock,
  type SommelierInput,
} from "@/lib/sommelier";
import { resolvePublicTechnicalTrust } from "@/lib/tech-facts/public-trust";
import { resolveTopList, topListRankScore } from "@/lib/top-lists";
import {
  buildWineFaq,
  buildWineProsCons,
  buildWorthItAnalysis,
} from "@/lib/wine-analysis";
import {
  buildWineJsonLd,
  buildWineMetadataDescription,
} from "@/lib/wine-json-ld";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { id: number; slug: string },
): WineWithRelations {
  return {
    name: overrides.slug,
    type: "white",
    sweetness: null,
    priceAvg: 48,
    currentPrice: null,
    valueScore: 72,
    giftScore: 90,
    foodMatchScore: 85,
    estimatedQuality: null,
    qualityFinal: null,
    qualityEffective: null,
    vintage: null,
    alcohol: null,
    grapeVarieties: [],
    foodPairings: [],
    foodPairingNotes: [],
    dessertPairings: [],
    medals: [],
    recommendedOccasions: [],
    thingsYouShouldKnow: [],
    availability: [],
    affiliateLinks: [],
    priceHistory: [],
    winery: null,
    region: null,
    ...overrides,
  } as WineWithRelations;
}

const SOMMELIER_INPUT: SommelierInput = {
  budgetMin: 0,
  budgetMax: 100,
  budgetSpecified: true,
  budgetConstraint: "hard",
  occasion: "oricare",
  color: "any",
  sweetness: "any",
  preferredWinerySlugs: [],
  absurdRequest: false,
};

afterEach(() => {
  setSecondaryScoringModeForTests(null);
});

describe("Prompt 22 public secondary semantic contract", () => {
  it("hides stored Food 85 and Gift 90 from every public copy surface", () => {
    setSecondaryScoringModeForTests("display");
    const hidden = wine({
      id: 1,
      slug: "hidden-secondary",
      tastingNotes: "Food Match 85/100 și Gift Score 90/100.",
    });
    const secondary = resolvePublicSecondaryScores(hidden);
    expect(secondary.food.score).toBeNull();
    expect(secondary.gift.score).toBeNull();

    const faq = buildWineFaq(hidden);
    const worthIt = buildWorthItAnalysis(hidden);
    const trust = resolvePublicTechnicalTrust(hidden, []);
    const prosCons = buildWineProsCons(hidden, trust);
    const metadata = buildWineMetadataDescription(hidden);
    const jsonLd = buildWineJsonLd(hidden, faq, trust);
    const sommelierContext = buildWineContextBlock(hidden);
    const chatContext = buildChatSommelierSystemPrompt(
      [hidden],
      SOMMELIER_INPUT,
    );
    const publicText = JSON.stringify({
      faq,
      worthIt,
      prosCons,
      metadata,
      jsonLd,
      sommelierContext,
      chatContext,
    });

    expect(publicText).not.toContain("85/100");
    expect(publicText).not.toContain("90/100");
    expect(publicText).not.toContain("Food 85");
    expect(publicText).not.toContain("Gift 90");
    expect(faq[1]?.answer).toContain("puține dovezi");
    expect(
      sanitizePublicSecondaryCopy(
        "Food Match 85/100 și Gift Score 90/100.",
        hidden,
      ),
    ).not.toMatch(/(?:85|90)\/100/);
  });

  it("keeps legacy ranking separate from guarded top-list display", () => {
    setSecondaryScoringModeForTests("display");
    const storedHigh = wine({ id: 1, slug: "stored-high", giftScore: 90 });
    const storedLow = wine({ id: 2, slug: "stored-low", giftScore: 80 });
    const list = resolveTopList("vinuri-cadou", [storedLow, storedHigh]);

    expect(list?.wines.map((row) => row.slug)).toEqual([
      "stored-high",
      "stored-low",
    ]);
    expect(list?.rankScores).toEqual([90, 80]);
    expect(
      topListRankScore(
        list!.wines[0]!,
        list!.rankMetric,
        list!.rankScores[0],
      ),
    ).toBeNull();
    expect(JSON.stringify(list?.faq)).not.toContain("90/100");
  });

  it("does not relabel a hidden legacy Food score as top-list relevance", () => {
    setSecondaryScoringModeForTests("display");
    const hidden = wine({ id: 1, slug: "hidden-food", foodMatchScore: 85 });
    const list = resolveTopList(
      "vinuri-sub-100-lei-pentru-sarmale",
      [hidden],
    );

    expect(list?.rankScores[0]).toBe(85);
    expect(
      topListRankScore(
        list!.wines[0]!,
        list!.rankMetric,
        list!.rankScores[0],
      ),
    ).toBeNull();
    expect(JSON.stringify(list?.faq)).not.toContain("85/100");
  });

  it("preserves shadow legacy display without leaking it into display mode", () => {
    const fixture = wine({ id: 1, slug: "shadow-secondary" });
    setSecondaryScoringModeForTests("shadow");
    expect(resolvePublicSecondaryScores(fixture).gift.score).toBe(90);
    expect(resolvePublicSecondaryScores(fixture).food.score).toBe(85);
    expect(buildWineFaq(fixture)[1]?.answer).toContain("85/100");

    setSecondaryScoringModeForTests("display");
    expect(resolvePublicSecondaryScores(fixture).gift.score).toBeNull();
    expect(resolvePublicSecondaryScores(fixture).food.score).toBeNull();
    expect(buildWineFaq(fixture)[1]?.answer).not.toContain("85/100");
  });

  it("covers normal, limited and hidden Gift plus displayable and hidden Food", () => {
    setSecondaryScoringModeForTests("display");
    const hidden = wine({ id: 1, slug: "hidden" });
    const limited = wine({
      id: 2,
      slug: "limited",
      estimatedQuality: 70,
      valueScore: 70,
      vintage: 2022,
      sweetness: "sec",
      alcohol: 13,
      criticScore: 75,
      grapeVarieties: [{ name: "Fetească Neagră" }],
    });
    const normal = wine({
      id: 3,
      slug: "normal",
      qualityFinal: 82,
      criticScore: 88,
      tastingSheetUrl: "https://producer.example/normal.pdf",
      vintage: 2022,
      sweetness: "sec",
      alcohol: 13.5,
      grapeVarieties: [{ name: "Fetească Neagră" }],
      foodPairings: [
        {
          dish: "Sarmale",
          category: "sarmale",
          source: "vinintel_curated",
          strength: "strong",
        },
        {
          dish: "Tocăniță de vânat",
          category: "game",
          source: "vinintel_curated",
          strength: "strong",
        },
      ],
    });

    expect(resolvePublicSecondaryScores(hidden).gift.score).toBeNull();
    expect(resolvePublicSecondaryScores(limited).gift.provisional).toBe(true);
    expect(resolvePublicSecondaryScores(limited).gift.score).not.toBeNull();
    expect(resolvePublicSecondaryScores(normal).gift.provisional).toBe(false);
    expect(resolvePublicSecondaryScores(normal).gift.score).not.toBeNull();
    expect(resolvePublicSecondaryScores(hidden).food.score).toBeNull();
    expect(resolvePublicSecondaryScores(normal).food.score).not.toBeNull();
  });

  it("guards public presentation modules against direct stored score reads", async () => {
    const publicModules = [
      "lib/wine-analysis.ts",
      "lib/sommelier.ts",
      "lib/sommelier-chat.ts",
      "lib/wine-json-ld.ts",
      "components/wines/wine-editorial.tsx",
      "components/wines/wine-dual-scores.tsx",
      "components/wines/wine-score-cards.tsx",
      "components/wines/wine-buying-decision.tsx",
      "components/top-lists/budget-page-sections.tsx",
    ];
    for (const path of publicModules) {
      const source = await readFile(path, "utf8");
      expect(source, path).not.toMatch(/wine\.(giftScore|foodMatchScore)/);
    }
  });
});

describe("Prompt 22 sitemap validation", () => {
  function families(): SitemapRouteFamilies {
    return {
      static: [{ url: "https://www.vinintel.ro/", lastModified: new Date() }],
      wines: [{ url: "https://www.vinintel.ro/wines/test" }],
      wineries: [],
      topLists: [],
      regions: [],
      soiuri: [],
      vinPentru: [],
      studii: [],
      journal: [{ url: "https://www.vinintel.ro/journal/test" }],
    };
  }

  it("keeps deterministic family order and reports complete counts", () => {
    const routeFamilies = families();
    expect(countSitemapRouteFamilies(routeFamilies)).toEqual({
      static: 1,
      wines: 1,
      wineries: 0,
      topLists: 0,
      regions: 0,
      soiuri: 0,
      vinPentru: 0,
      studii: 0,
      journal: 1,
      total: 3,
    });
    expect(flattenSitemapRouteFamilies(routeFamilies).map((row) => row.url))
      .toEqual([
        "https://www.vinintel.ro/",
        "https://www.vinintel.ro/wines/test",
        "https://www.vinintel.ro/journal/test",
      ]);
  });

  it("fails with the responsible family and item for an invalid date", () => {
    const routeFamilies = families();
    routeFamilies.wines[0]!.lastModified = new Date("invalid");
    expect(() => flattenSitemapRouteFamilies(routeFamilies)).toThrow(
      "Sitemap wines[0] has invalid lastModified",
    );
  });

  it("fails explicitly for duplicate URLs instead of emitting invalid XML", () => {
    const routeFamilies = families();
    routeFamilies.journal[0]!.url = routeFamilies.wines[0]!.url;
    expect(() => flattenSitemapRouteFamilies(routeFamilies)).toThrow(
      "Sitemap duplicate URL in wines and journal",
    );
  });
});
