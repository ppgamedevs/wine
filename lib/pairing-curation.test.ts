import { describe, expect, it } from "vitest";
import {
  assertCurationAdmin,
  buildCurationWritePatch,
  generatePairingDrafts,
  isVinIntelCuratedPairing,
  previewCurationImpact,
  publicPairingAttribution,
  publicProducerAttribution,
  scoreCurationQueuePriority,
  selectBalancedCurationBatch,
  toApprovedFoodPairings,
  validatePairingDrafts,
  wineCurationStatus,
  type PairingDraft,
} from "@/lib/pairing-curation";
import { draftFromEdit } from "@/lib/pairing-curation-cards";
import { categorizeFoodItems } from "@/lib/food-taxonomy";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: 11,
    name: slug,
    slug,
    type: "red",
    sweetness: "sec",
    status: "verified",
    foodPairings: [],
    producerContent: null,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    valueScore: 72,
    giftScore: 60,
    foodMatchScore: 48,
    alcohol: 13.5,
    winery: { name: "Balla Geza", slug: "balla-geza" },
    ...rest,
  } as WineWithRelations;
}

function draft(overrides: Partial<PairingDraft> = {}): PairingDraft {
  return {
    dish: "Sarmale",
    category: "sarmale",
    rationale: "Un rosu sec din acest stil este o alegere editoriala pentru sarmale.",
    basis: ["verified_style"],
    confidence: "MEDIUM",
    strength: "good",
    styleOnlyWarning: true,
    provenanceLocked: true,
    ...overrides,
  };
}

describe("pairing curation", () => {
  it("A: drafts are never automatically curated pairings", () => {
    const generated = generatePairingDrafts(wine({ slug: "balla-test" }));
    expect(generated.length).toBeGreaterThan(0);
    expect(generated.every((item) => item.rationale.length > 0)).toBe(true);
    expect(generated.every((item) => !("source" in item))).toBe(true);
    const approved = toApprovedFoodPairings([], []);
    expect(approved).toEqual([]);
    expect(wine({ slug: "untouched" }).foodPairings).toEqual([]);
  });

  it("B: approval requires admin auth", () => {
    expect(() => assertCurationAdmin(false)).toThrow(/admin/);
    expect(() => assertCurationAdmin(true)).not.toThrow();
  });

  it("C: approved pairings have curated metadata", () => {
    const approved = toApprovedFoodPairings([draft()], [], "2026-08-16T00:00:00.000Z");
    expect(approved[0]?.source).toBe("vinintel_curated");
    expect(approved[0]?.curatedBy).toBe("admin");
    expect(approved[0]?.curatedAt).toBe("2026-08-16T00:00:00.000Z");
    expect(approved[0]?.basis).toContain("verified_style");
    expect(isVinIntelCuratedPairing(approved[0]!)).toBe(true);
  });

  it("D: producer evidence stays separate from curated pairings", () => {
    const item = wine({
      slug: "with-producer",
      producerContent: {
        culinaryPairings: "Se recomanda cu sarmale.",
        foodEvidence: [
          {
            category: "sarmale",
            dish: "sarmale",
            sourceType: "producer_page",
            excerpt: "Se recomanda cu sarmale.",
            extractionMethod: "deterministic",
            evidenceClass: "PRODUCER_EXACT",
            confidence: 76,
          },
        ],
      },
    });
    const generated = generatePairingDrafts(item);
    expect(item.producerContent?.culinaryPairings).toContain("sarmale");
    expect(item.foodPairings).toEqual([]);
    expect(generated.some((row) => row.basis.includes("producer_evidence"))).toBe(true);
  });

  it("E: curation patch cannot include stored scores", () => {
    const patch = buildCurationWritePatch([{ dish: "Sarmale", source: "vinintel_curated" }]);
    expect(patch).toEqual({
      foodPairings: [{ dish: "Sarmale", source: "vinintel_curated" }],
    });
    expect("giftScore" in patch).toBe(false);
    expect("foodMatchScore" in patch).toBe(false);
    expect("valueScore" in patch).toBe(false);
  });

  it("F: mici and mititei are one category", () => {
    expect(categorizeFoodItems(["mici", "mititei"])).toEqual(["grilled_meat"]);
    const issues = validatePairingDrafts(wine({ slug: "dup" }), [
      draft({ dish: "Mici", category: "grilled_meat" }),
      draft({ dish: "Mititei", category: "grilled_meat" }),
    ]);
    expect(issues.some((issue) => issue.code === "duplicate_synonym")).toBe(true);
  });

  it("G: unsupported sensory rationale is rejected", () => {
    const issues = validatePairingDrafts(wine({ slug: "sensory" }), [
      draft({
        rationale: "Taninurile ferme ale acestui vin taie grasimea micilor.",
      }),
    ]);
    expect(issues.some((issue) => issue.code === "unsupported_sensory")).toBe(true);
  });

  it("H: drafts use verified style and safe producer evidence only", () => {
    const generated = generatePairingDrafts(
      wine({
        slug: "facts-only",
        tasteProfile: "Taninuri ferme, stejar, fructe negre inventate",
        foodPairingNotes: [{ dish: "Inventat", note: "nu trimite asta" }],
      }),
    );
    expect(generated.every((row) => !/tanin|stejar|inventat/i.test(row.rationale))).toBe(
      true,
    );
    expect(generated.every((row) => row.basis.length > 0)).toBe(true);
  });

  it("I: reviewer edit is preserved exactly", () => {
    const edited = draftFromEdit(draft(), "Ceafa de porc", "Motivare editata de recenzor.");
    expect(edited.dish).toBe("Ceafa de porc");
    expect(edited.rationale).toBe("Motivare editata de recenzor.");
    expect(edited.basis).toContain("editorial_judgment");
  });

  it("J: score impact preview is in memory only", () => {
    const item = wine({ slug: "preview" });
    const before = item.foodMatchScore;
    const impact = previewCurationImpact(item, [draft()]);
    expect(item.foodMatchScore).toBe(before);
    expect(impact.predictedFood.score).toBeGreaterThan(0);
    expect(impact.currentFood.level).toBe("style_only");
  });

  it("K: public producer attribution is not VinIntel curation", () => {
    expect(publicProducerAttribution()).toBe("Recomandarea producatorului");
    expect(
      publicPairingAttribution({ dish: "Sarmale", source: "vinintel_curated" }),
    ).toBe("Recomandare VinIntel");
    expect(publicProducerAttribution()).not.toBe("Recomandare VinIntel");
  });

  it("L: shadow mode stays shadow after curation helpers", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
    buildCurationWritePatch(toApprovedFoodPairings([draft()], []));
    expect(getSecondaryScoringMode()).toBe("shadow");
  });
});

const BATCH_WINERIES: Array<{ slug: string; name: string; count: number }> = [
  { slug: "balla-geza", name: "Balla Geza", count: 10 },
  { slug: "budureasca", name: "Budureasca", count: 9 },
  { slug: "avincis", name: "Avincis", count: 7 },
  { slug: "crama-gabai", name: "Gabai", count: 5 },
  { slug: "murfatlar", name: "Murfatlar", count: 4 },
  { slug: "cramele-recas", name: "Recas", count: 8 },
];

function batchCatalog(): WineWithRelations[] {
  const catalog: WineWithRelations[] = [];
  let id = 1;
  for (const winery of BATCH_WINERIES) {
    for (let index = 0; index < winery.count; index += 1) {
      catalog.push(
        wine({
          id,
          slug: `${winery.slug}-wine-${index + 1}`,
          name: `${winery.name} ${index + 1}`,
          type: index % 2 === 0 ? "red" : "white",
          valueScore: 60 + (index % 20),
          priceAvg: 40 + index * 5,
          foodPairings: [],
          winery: { name: winery.name, slug: winery.slug } as WineWithRelations["winery"],
        }),
      );
      id += 1;
    }
  }
  return catalog;
}

describe("pairing curation stable batch", () => {
  it("A: batch slugs and order stay identical after wine 1 is curated", () => {
    const catalog = batchCatalog();
    const before = selectBalancedCurationBatch(catalog, 30);
    expect(before).toHaveLength(30);
    const firstSlug = before[0]?.slug;
    expect(firstSlug).toBeTruthy();
    const afterCatalog = catalog.map((item) =>
      item.slug === firstSlug
        ? {
            ...item,
            foodPairings: [
              {
                dish: "Sarmale",
                source: "vinintel_curated" as const,
                curatedAt: "2026-08-16T18:00:00.000Z",
                curatedBy: "admin",
              },
            ],
          }
        : item,
    );
    const after = selectBalancedCurationBatch(afterCatalog, 30);
    expect(after.map((item) => item.slug)).toEqual(before.map((item) => item.slug));
    expect(wineCurationStatus(afterCatalog.find((item) => item.slug === firstSlug)!)).toBe(
      "curated",
    );
    expect(wineCurationStatus(before[0]!)).toBe("pending");
  });

  it("queue priority ignores foodPairings review status", () => {
    const catalog = batchCatalog();
    const empty = scoreCurationQueuePriority(catalog);
    const curated = scoreCurationQueuePriority(
      catalog.map((item, index) =>
        index === 0
          ? {
              ...item,
              foodPairings: [{ dish: "Mici", source: "vinintel_curated" as const }],
            }
          : item,
      ),
    );
    expect(curated.map((row) => [row.slug, row.productValue, row.coverage])).toEqual(
      empty.map((row) => [row.slug, row.productValue, row.coverage]),
    );
  });
});
