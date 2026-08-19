import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { scoreDishCompatibility } from "@/lib/pairing/dish-compatibility";
import { findRomanianDishByName } from "@/lib/pairing/romanian-dishes";
import { buildWinePairingProfile } from "@/lib/pairing/wine-pairing-profile";
import { resolvePublicWinePairings } from "@/lib/public-wine-pairings";
import { parseOccasionMatchMode } from "@/lib/recommendation/occasion-match-mode";
import { buildWineFaq } from "@/lib/wine-analysis";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> = {},
): WineWithRelations {
  return {
    id: 27,
    name: "Vin Prompt 27A",
    slug: "vin-prompt-27a",
    type: "red",
    sweetness: "sec",
    status: "verified",
    priceAvg: 65,
    valueScore: 78,
    giftScore: 71,
    foodMatchScore: 64,
    estimatedQuality: 80,
    vintage: 2022,
    alcohol: 13.5,
    grapeVarieties: [{ name: "Fetească Neagră" }],
    foodPairings: [],
    foodPairingNotes: [],
    dessertPairings: [],
    recommendedOccasions: [],
    availability: [],
    affiliateLinks: [],
    priceHistory: [],
    medals: [],
    thingsYouShouldKnow: [],
    winery: { id: 1, name: "Crama Test", slug: "crama-test" },
    region: { id: 1, name: "Dealu Mare", slug: "dealu-mare" },
    ...overrides,
  } as WineWithRelations;
}

describe("Prompt 27A public pairing resolver", () => {
  it("uses exact deterministic dish compatibility and limits output to four", () => {
    const item = wine({
      foodPairings: [
        { dish: "Mici", strength: "strong", source: "vinintel_curated" },
        {
          dish: "Tocăniță de vânat",
          strength: "good",
          source: "vinintel_curated",
        },
        {
          dish: "Plachie de crap",
          strength: "possible",
          source: "vinintel_curated",
        },
        {
          dish: "Mămăligă cu brânză și smântână",
          strength: "good",
          source: "vinintel_curated",
        },
        {
          dish: "Sarmale clasice",
          strength: "strong",
          source: "vinintel_curated",
        },
      ],
      foodPairingNotes: [
        {
          dish: "Mici",
          note: "Scor editorial vechi.",
          score: 12,
        },
      ],
    });
    const before = JSON.stringify({
      foodPairings: item.foodPairings,
      foodPairingNotes: item.foodPairingNotes,
    });
    const result = resolvePublicWinePairings(item);

    expect(result).toHaveLength(4);
    expect(result.every((pairing) => pairing.score != null)).toBe(true);
    expect(result.every((pairing) => pairing.scoreSource === "dish_compatibility"))
      .toBe(true);
    expect(result.map((pairing) => pairing.rawScore)).toEqual(
      [...result]
        .map((pairing) => pairing.rawScore)
        .sort((left, right) => (right ?? 0) - (left ?? 0)),
    );

    const firstInput = item.foodPairings?.find(
      (pairing) => pairing.dish === result[0]?.dish,
    );
    const canonicalDish = findRomanianDishByName(result[0]!.dish);
    expect(firstInput).toBeTruthy();
    expect(canonicalDish).toBeTruthy();
    const expectedRaw = scoreDishCompatibility(
      buildWinePairingProfile(item),
      canonicalDish!,
    ).score;
    expect(result[0]?.rawScore).toBe(expectedRaw);
    expect(result[0]?.score).toBe(
      Math.max(0, Math.min(100, Math.round(expectedRaw))),
    );
    expect(result.find((pairing) => pairing.dish === "Mici")?.score).not.toBe(
      12,
    );
    expect(
      JSON.stringify({
        foodPairings: item.foodPairings,
        foodPairingNotes: item.foodPairingNotes,
      }),
    ).toBe(before);
  });

  it("uses a supported attached score but ignores curated legacy numbers", () => {
    const result = resolvePublicWinePairings(
      wine({
        foodPairings: [
          {
            dish: "Preparat vechi identificat",
            score: 81,
            strength: "possible",
          },
          {
            dish: "Preparat curat fără identitate",
            score: 99,
            strength: "strong",
            source: "vinintel_curated",
          },
        ],
      }),
    );

    expect(result[0]).toMatchObject({
      dish: "Preparat vechi identificat",
      score: 81,
      scoreSource: "stored_pairing",
    });
    expect(result[1]).toMatchObject({
      dish: "Preparat curat fără identitate",
      score: null,
      scoreSource: "none",
    });
  });

  it("falls back to strength when no defensible numeric score exists", () => {
    const result = resolvePublicWinePairings(
      wine({
        foodPairings: [
          {
            dish: "Preparat posibil",
            strength: "possible",
            source: "vinintel_curated",
          },
          {
            dish: "Preparat bun",
            strength: "good",
            source: "vinintel_curated",
          },
          {
            dish: "Preparat puternic",
            strength: "strong",
            source: "vinintel_curated",
          },
        ],
      }),
    );

    expect(result.map((pairing) => pairing.dish)).toEqual([
      "Preparat puternic",
      "Preparat bun",
      "Preparat posibil",
    ]);
    expect(result.every((pairing) => pairing.score == null)).toBe(true);
  });

  it("requires exact current producer evidence for attribution", () => {
    const pairing = {
      dish: "Tocăniță de vânat",
      category: "game",
      source: "vinintel_curated" as const,
      basis: ["producer_evidence" as const],
      strength: "strong" as const,
    };
    const explicit = wine({
      name: "EXPLICIT Fetească Neagră",
      slug: "explicit-feteasca-neagra",
      foodPairings: [pairing],
      producerContent: { culinaryPairings: "Se recomandă cu vânat." },
    });
    const exact = wine({
      foodPairings: [pairing],
      producerContent: {
        culinaryPairings: "Se recomandă cu Tocăniță de vânat.",
      },
    });

    expect(resolvePublicWinePairings(explicit)[0]?.attribution).toBe(
      "Recomandare VinIntel",
    );
    expect(resolvePublicWinePairings(exact)[0]?.attribution).toBe(
      "Recomandat și de producător",
    );
  });

  it("feeds the FAQ from the same highest scoring canonical pairing", () => {
    const item = wine({
      foodPairings: [
        { dish: "Mici", strength: "strong", source: "vinintel_curated" },
        {
          dish: "Plachie de crap",
          strength: "good",
          source: "vinintel_curated",
        },
      ],
      foodPairingNotes: [
        {
          dish: "Preparat editorial diferit",
          note: "Nu trebuie folosit public.",
          score: 99,
        },
      ],
    });
    const topPairing = resolvePublicWinePairings(item, 1)[0]!;
    const foodFaq = buildWineFaq(item).find((entry) =>
      entry.question.startsWith("Ce mancare"),
    );

    expect(foodFaq?.answer).toContain(topPairing.dish);
    expect(foodFaq?.answer).toContain(`${topPairing.score}/100`);
    expect(foodFaq?.answer).not.toContain("Preparat editorial diferit");
    expect(foodFaq?.answer).not.toContain("Versatilitatea");
  });
});

describe("Prompt 27A public presentation guards", () => {
  it("uses one clear heading and hides all legacy editorial recommendation lists", async () => {
    const [pairings, editorial, scoreCards] = await Promise.all([
      readFile(
        new URL("../components/wines/wine-pairings.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../components/wines/wine-editorial.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../components/wines/wine-score-cards.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    expect(pairings).toContain("Cu ce se potrivește");
    expect(pairings).not.toMatch(/Cu ce îl mănânci|Cu ce il mananci/);
    expect(pairings).toContain("{pairing.score}/100");
    expect(editorial).not.toMatch(
      /foodPairingNotes|dessertPairings|recommendedOccasions/,
    );
    expect(editorial).not.toMatch(
      /Pairing-uri recomandate|Ocazii recomandate/,
    );
    expect(scoreCards).toContain("Versatilitate la masă");
  });

  it("keeps Occasion Match internal and the resolver read only", async () => {
    const resolver = await readFile(
      new URL("./public-wine-pairings.ts", import.meta.url),
      "utf8",
    );

    expect(parseOccasionMatchMode("internal")).toBe("internal");
    expect(resolver).not.toMatch(
      /\b(db|database)\b|\.insert\(|\.update\(|\.delete\(/,
    );
  });
});
