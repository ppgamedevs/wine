import { describe, expect, it, vi } from "vitest";
import {
  buildProgrammaticLinks,
  buildWineFaq,
  buildWorthItAnalysis,
} from "@/lib/wine-analysis";
import type { WineWithRelations } from "@/types";

vi.mock("server-only", () => ({}));

const wine = {
  id: 1,
  slug: "selene",
  name: "Selene Fetească Neagră",
  type: "red",
  sweetness: "sec",
  vintage: 2022,
  valueScore: 82,
  priceAvg: 78,
  currentPrice: 78,
  grapeVarieties: [{ name: "Fetească Neagră" }],
  foodPairings: [
    {
      dish: "Sarmale clasice",
      dishId: "sarmale",
      source: "vinintel_curated",
      strength: "strong",
    },
  ],
  winery: { name: "Cramele Recaș", slug: "cramele-recas", verified: true },
  region: { name: "Banat", slug: "banat" },
} as unknown as WineWithRelations;

describe("English wine analysis", () => {
  it("localizes buyer verdict and FAQ without altering names or scores", () => {
    const faq = buildWineFaq(wine, "en");
    const serialized = JSON.stringify(faq);

    expect(buildWorthItAnalysis(wine, "en").summary).toContain(
      "Value Score of 82/100",
    );
    expect(serialized).toContain("Selene Fetească Neagră");
    expect(serialized).toContain("82");
    expect(serialized).toContain("compatibility score");
    expect(serialized).not.toContain("Ce mancare");
  });

  it("uses locale-aware programmatic paths", () => {
    const links = buildProgrammaticLinks(wine, "en");
    expect(links.map((link) => link.href)).toEqual(
      expect.arrayContaining([
        "/en/regions/banat",
        "/en/wineries/cramele-recas",
        "/en/wine-for/sarmale",
      ]),
    );
  });
});

