import { describe, expect, it, vi } from "vitest";
import { resolvePublicWinePairings } from "@/lib/public-wine-pairings";
import type { WineWithRelations } from "@/types";

vi.mock("server-only", () => ({}));

function fixture(): WineWithRelations {
  return {
    id: 1,
    slug: "fixture",
    name: "Fixture",
    type: "red",
    sweetness: "sec",
    vintage: 2022,
    grapeVarieties: [{ name: "Fetească Neagră" }],
    foodPairings: [
      {
        dish: "Sarmale clasice",
        dishId: "sarmale",
        note: "Notă românească stocată.",
        source: "vinintel_curated",
        strength: "strong",
      },
    ],
    winery: null,
    region: null,
  } as unknown as WineWithRelations;
}

describe("English pairing presentation", () => {
  it("keeps the canonical score and uses English presentation only", () => {
    const [pairing] = resolvePublicWinePairings(fixture(), 4, "en");

    expect(pairing?.dish).toBe("Sarmale");
    expect(pairing?.score).toEqual(expect.any(Number));
    expect(pairing?.attribution).toBe("VinIntel recommendation");
    expect(pairing?.rationale).toMatch(/Sarmale/);
    expect(pairing?.rationale).not.toContain("Notă românească");
  });
});

