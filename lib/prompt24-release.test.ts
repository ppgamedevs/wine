import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  classifyPublicPageHtml,
  countHiddenSecondaryPayloadLeaks,
  totalSecondaryPayloadLeaks,
} from "@/lib/public-payload-audit";
import {
  filterWinesByGrapeVariety,
  getIndexableGrapeVarieties,
} from "@/lib/grape-variety-index";
import { buildPublicWineCardViewModel } from "@/lib/public-wine-card";
import { resolvePublicSecondaryScores } from "@/lib/scoring-v2/public-secondary-display";
import { setSecondaryScoringModeForTests } from "@/lib/scoring-v2/secondary-scoring-mode";
import {
  validateSitemapFamilyExpectations,
  type SitemapRouteFamilies,
} from "@/lib/sitemap-validation";
import type { WineWithRelations } from "@/types";

afterEach(() => setSecondaryScoringModeForTests(null));

function hiddenWine(): WineWithRelations {
  return {
    id: 24,
    slug: "prompt24-hidden",
    name: "Prompt 24 Hidden",
    type: "white",
    sweetness: "sec",
    vintage: null,
    status: "verified",
    valueScore: 68,
    giftScore: 60,
    foodMatchScore: 80,
    priceAvg: null,
    currentPrice: null,
    grapeVarieties: [{ name: "Riesling Italian" }],
    foodPairings: [],
    dessertPairings: [],
    medals: [],
    priceHistory: [],
    availability: [],
    affiliateLinks: [],
    valueExplanation:
      "Scoruri VinIntel:\nGift: 60/100\nFood Match: 80/100",
    descriptionEditorial: "Gift: 60/100",
    producerContent: { sourceUrl: "https://example.com/private-source" },
    winery: {
      id: 1,
      name: "Crama Fixture",
      slug: "crama-fixture",
      verified: false,
    },
    region: { id: 1, name: "Dobrogea", slug: "dobrogea" },
  } as unknown as WineWithRelations;
}

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const itemPath = path.join(root, entry.name);
      if (entry.isDirectory()) return sourceFiles(itemPath);
      return /\.(?:ts|tsx)$/.test(entry.name) ? [itemPath] : [];
    }),
  );
  return nested.flat();
}

describe("Prompt 24 public client payload boundary", () => {
  it("serializes only the explicit card allowlist", () => {
    setSecondaryScoringModeForTests("display");
    const wine = hiddenWine();
    const secondary = resolvePublicSecondaryScores(wine);
    expect(secondary.gift.score).toBeNull();
    expect(secondary.food.score).toBeNull();

    const serialized = JSON.stringify(buildPublicWineCardViewModel(wine));
    expect(serialized).not.toMatch(
      /giftScore|foodMatchScore|valueExplanation|descriptionEditorial|producerContent/,
    );
    expect(serialized).not.toContain("Gift: 60/100");
    expect(serialized).not.toContain("Food Match: 80/100");
    expect(serialized).not.toContain("private-source");
  });

  it("forbids full wine domain types in public client components", async () => {
    const files = [
      ...(await sourceFiles("components")),
      ...(await sourceFiles("app")),
    ].filter(
      (file) =>
        !file.includes(`${path.sep}admin${path.sep}`) &&
        !file.endsWith("error.tsx"),
    );

    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (!/^[\s\uFEFF]*["']use client["'];/m.test(source)) continue;
      expect(source, file).not.toMatch(
        /\b(?:WineWithRelations|WineryWithWines)\b/,
      );
    }
  });

  it("classifies visible, metadata, JSON-LD, and Flight separately", () => {
    const html = `
      <html><head>
        <title>Safe</title><meta name="description" content="Safe">
        <script type="application/ld+json">{"@type":"FAQPage"}</script>
      </head><body><main>Scor indisponibil</main>
        <script>self.__next_f.push([1,"{\\"giftScore\\":60,\\"foodMatchScore\\":80,\\"raw\\":\\"Gift: 60/100 Food Match: 80/100\\"}"])</script>
      </body></html>`;
    const surfaces = classifyPublicPageHtml(html);
    const fixture = { giftScore: 60, foodMatchScore: 80 };

    expect(totalSecondaryPayloadLeaks(
      countHiddenSecondaryPayloadLeaks(surfaces.visibleText, fixture),
    )).toBe(0);
    expect(totalSecondaryPayloadLeaks(
      countHiddenSecondaryPayloadLeaks(surfaces.jsonLd, fixture),
    )).toBe(0);
    expect(totalSecondaryPayloadLeaks(
      countHiddenSecondaryPayloadLeaks(surfaces.flightData, fixture),
    )).toBeGreaterThan(0);
  });
});

describe("Prompt 24 canonical grape and sitemap truth", () => {
  it("matches name-only grape JSON across diacritics", () => {
    const wines = [
      { grapeVarieties: [{ name: "Fetească Neagră" }] },
      { grapeVarieties: [{ name: "Feteasca Neagra" }] },
      { grapeVarieties: [{ name: "Merlot" }] },
    ] as WineWithRelations[];
    const grape = { slug: "feteasca-neagra", name: "Feteasca Neagra" };

    expect(filterWinesByGrapeVariety(wines, grape)).toHaveLength(2);
    expect(getIndexableGrapeVarieties(wines, [grape], 2)).toEqual([
      { ...grape, wineCount: 2 },
    ]);
  });

  it("fails when an eligible sitemap family is unexpectedly empty", () => {
    const families: SitemapRouteFamilies = {
      static: [{ url: "https://www.vinintel.ro/" }],
      wines: [],
      wineries: [],
      topLists: [],
      regions: [],
      soiuri: [],
      vinPentru: [],
      studii: [],
      journal: [],
    };

    expect(() =>
      validateSitemapFamilyExpectations(families, {
        soiuri: { expected: "nonempty", count: 1 },
      }),
    ).toThrow("Sitemap soiuri is UNEXPECTEDLY_EMPTY");
    expect(
      validateSitemapFamilyExpectations(families, {
        soiuri: { expected: "empty" },
      }).soiuri,
    ).toBe("EXPECTED_EMPTY");
  });
});
