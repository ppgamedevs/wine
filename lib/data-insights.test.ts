import { describe, expect, it } from "vitest";
import { buildSub50Study2026 } from "@/lib/data-insights";
import type { WineWithRelations } from "@/types";

function wine(id: number, price: number | null, valueScore: number | null) {
  return {
    id,
    slug: `study-${id}`,
    name: `Study Wine ${id}`,
    priceAvg: price,
    currentPrice: price,
    valueScore,
    winery: { name: "Winery", slug: "winery" },
    grapeVarieties: [],
  } as unknown as WineWithRelations;
}

describe("sub-50 study consistency", () => {
  it("does not report a zero average for an empty dataset", () => {
    const study = buildSub50Study2026([]);
    expect(study.winesUnder50).toBe(0);
    expect(study.avgPriceUnder50).toBeNull();
    expect(study.avgValueScoreUnder50).toBeNull();
    expect(study.top50).toEqual([]);
  });

  it("uses the same priced and scored eligibility as budget rankings", () => {
    const study = buildSub50Study2026([
      wine(1, 25, 80),
      wine(2, 65, 77),
      wine(3, null, 90),
      wine(4, 40, null),
    ]);
    expect(study.winesUnder50).toBe(1);
    expect(study.avgPriceUnder50).toBe(25);
    expect(study.avgValueScoreUnder50).toBe(80);
    expect(study.top50.map((item) => item.id)).toEqual([1]);
  });
});
