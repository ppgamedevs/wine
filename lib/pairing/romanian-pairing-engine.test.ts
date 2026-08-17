import { describe, expect, it } from "vitest";
import { generatePairingDrafts } from "@/lib/pairing-curation";
import { buildCurationWritePatch, toApprovedFoodPairings } from "@/lib/pairing-curation";
import { scoreRomanianPairingLibrary } from "@/lib/pairing/generate-romanian-drafts";
import { findRomanianDishByName, foldDishName } from "@/lib/pairing/romanian-dishes";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: 21,
    name: slug,
    slug,
    type: "red",
    sweetness: "sec",
    status: "verified",
    foodPairings: [],
    producerContent: null,
    grapeVarieties: [{ name: "Feteasca Neagra" }],
    valueScore: 70,
    giftScore: 60,
    foodMatchScore: 50,
    alcohol: 13.5,
    winery: { name: "Test", slug: "test" },
    ...rest,
  } as WineWithRelations;
}

describe("Romanian pairing intelligence engine", () => {
  it("A: dry red no longer always gets exactly Sarmale/Mici/Cheese", () => {
    const drafts = generatePairingDrafts(
      wine({ slug: "fn-dry", grapeVarieties: [{ name: "Feteasca Neagra" }] }),
    );
    const names = drafts.map((row) => row.dish).sort();
    expect(names).not.toEqual(
      ["Branzeturi maturate", "Mici", "Sarmale"].sort(),
    );
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.length).toBeLessThanOrEqual(4);
  });

  it("B: Feteasca Neagra can consider multiple Romanian traditional dishes", () => {
    const ranked = scoreRomanianPairingLibrary(
      wine({ slug: "fn-rank", grapeVarieties: [{ name: "Feteasca Neagra" }] }),
    );
    const names = ranked.slice(0, 20).map((row) => row.dish.id);
    const traditional = [
      "sarmale",
      "rata-pe-varza",
      "pastrama-de-oaie",
      "tochitura-moldoveneasca",
      "varza-a-la-cluj",
      "miel-la-cuptor",
    ];
    expect(traditional.filter((id) => names.includes(id)).length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("C: lighter red can prefer duck/rabbit over heavy smoked pork", () => {
    const ranked = scoreRomanianPairingLibrary(
      wine({
        slug: "pinot",
        grapeVarieties: [{ name: "Pinot Noir" }],
        alcohol: 12.8,
      }),
    );
    const duck = ranked.find((row) => row.dish.id === "rata-pe-varza")?.score ?? 0;
    const rabbit = ranked.find((row) => row.dish.id === "iepure-la-cuptor")?.score ?? 0;
    const smoked =
      ranked.find((row) => row.dish.id === "ciolan-afumat-cu-fasole")?.score ?? 0;
    expect(Math.max(duck, rabbit)).toBeGreaterThan(smoked);
  });

  it("D: rich red can prefer substantial/smoked dishes", () => {
    const ranked = scoreRomanianPairingLibrary(
      wine({
        slug: "cab",
        grapeVarieties: [{ name: "Cabernet Sauvignon" }],
        alcohol: 14.6,
      }),
    );
    const smoked =
      ranked.find((row) => row.dish.id === "ciolan-afumat-cu-fasole")?.score ?? 0;
    const trout =
      ranked.find((row) => row.dish.id === "pastrav-la-gratar-cu-mamaliga")?.score ??
      0;
    expect(smoked).toBeGreaterThan(trout);
  });

  it("E: dry white can rank Romanian fish dishes", () => {
    const ranked = scoreRomanianPairingLibrary(
      wine({
        slug: "sb",
        type: "white",
        grapeVarieties: [{ name: "Sauvignon Blanc" }],
        alcohol: 12.5,
      }),
    );
    const fish = ranked.find((row) => row.dish.id === "saramura-de-crap")?.score ?? 0;
    const pork = ranked.find((row) => row.dish.id === "pomana-porcului")?.score ?? 0;
    expect(fish).toBeGreaterThan(pork);
  });

  it("F: sparkling has richer Romanian starter options than generic Aperitive", () => {
    const drafts = generatePairingDrafts(
      wine({
        slug: "sparkle",
        type: "sparkling",
        grapeVarieties: [{ name: "Chardonnay" }],
        alcohol: 12,
      }),
    );
    const names = drafts.map((row) => row.dish);
    expect(names).not.toEqual(["Aperitive", "Fructe de mare"]);
    expect(
      names.some((name) =>
        /icre|placinta|hamsii|zacusca|telemea|pastrav/i.test(name),
      ),
    ).toBe(true);
  });

  it("G: sweet aromatic wine can rank Romanian desserts", () => {
    const ranked = scoreRomanianPairingLibrary(
      wine({
        slug: "tamaioasa",
        type: "white",
        sweetness: "dulce",
        grapeVarieties: [{ name: "Tamaioasa Romaneasca" }],
        sugar: 45,
      }),
    );
    const dessert = ranked.find((row) => row.dish.id === "cozonac")?.score ?? 0;
    const sarmale = ranked.find((row) => row.dish.id === "sarmale")?.score ?? 0;
    expect(dessert).toBeGreaterThan(sarmale);
  });

  it("H: dry wine does not receive dessert without evidence", () => {
    const drafts = generatePairingDrafts(
      wine({ slug: "dry-no-dessert", sweetness: "sec" }),
    );
    expect(
      drafts.every(
        (row) => row.category !== "dessert" && row.category !== "chocolate",
      ),
    ).toBe(true);
  });

  it("I: producer exact evidence boosts relevant dish", () => {
    const base = scoreRomanianPairingLibrary(wine({ slug: "no-prod" }));
    const boosted = scoreRomanianPairingLibrary(
      wine({
        slug: "prod-rata",
        producerContent: {
          culinaryPairings: "Se recomanda cu rata pe varza.",
          foodEvidence: [
            {
              category: "poultry",
              dish: "rata pe varza",
              sourceType: "producer_page",
              excerpt: "Se recomanda cu rata pe varza.",
              extractionMethod: "deterministic",
              evidenceClass: "PRODUCER_EXACT",
              confidence: 80,
            },
          ],
        },
      }),
    );
    const before = base.find((row) => row.dish.id === "rata-pe-varza")?.score ?? 0;
    const after = boosted.find((row) => row.dish.id === "rata-pe-varza")?.score ?? 0;
    expect(after).toBeGreaterThan(before);
    const drafts = generatePairingDrafts(
      wine({
        slug: "prod-rata-draft",
        producerContent: {
          culinaryPairings: "Se recomanda cu rata pe varza.",
          foodEvidence: [
            {
              category: "poultry",
              dish: "rata pe varza",
              sourceType: "producer_page",
              excerpt: "Se recomanda cu rata pe varza.",
              extractionMethod: "deterministic",
              evidenceClass: "PRODUCER_EXACT",
              confidence: 80,
            },
          ],
        },
      }),
    );
    const rata = drafts.find((row) => /rata pe varza/i.test(foldDishName(row.dish)));
    expect(rata?.basis.includes("producer_evidence")).toBe(true);
  });

  it("J: producer category evidence does not become falsely exact dish attribution", () => {
    const drafts = generatePairingDrafts(
      wine({
        slug: "prod-poultry",
        producerContent: {
          culinaryPairings: "Se recomanda cu pasare.",
          foodEvidence: [
            {
              category: "poultry",
              dish: "pasare",
              sourceType: "producer_page",
              excerpt: "Se recomanda cu pasare.",
              extractionMethod: "deterministic",
              evidenceClass: "PRODUCER_EXACT",
              confidence: 76,
            },
          ],
        },
      }),
    );
    expect(
      drafts.some(
        (row) =>
          row.dish === "Rata pe varza" && row.basis.includes("producer_evidence"),
      ),
    ).toBe(false);
  });

  it("K: four recommendations are diverse", () => {
    const drafts = generatePairingDrafts(
      wine({ slug: "diverse", grapeVarieties: [{ name: "Feteasca Neagra" }] }),
    );
    const families = drafts.map(
      (row) => findRomanianDishByName(row.dish)?.family ?? row.dish,
    );
    expect(new Set(families).size).toBe(drafts.length);
    const proteins = drafts.map(
      (row) => findRomanianDishByName(row.dish)?.protein ?? row.dish,
    );
    expect(new Set(proteins).size).toBeGreaterThanOrEqual(3);
  });

  it("L: same-category synonyms cannot fill multiple slots", () => {
    const drafts = generatePairingDrafts(
      wine({ slug: "syn", grapeVarieties: [{ name: "Feteasca Neagra" }] }),
    );
    const names = drafts.map((row) => row.dish.toLowerCase());
    expect(names.includes("mici") && names.includes("mititei")).toBe(false);
  });

  it("M: existing curated pairing is not reproposed", () => {
    const drafts = generatePairingDrafts(
      wine({
        slug: "already",
        foodPairings: [
          { dish: "Sarmale", category: "sarmale", source: "vinintel_curated" },
        ],
      }),
    );
    expect(drafts.some((row) => /sarmale|varza a la cluj/i.test(row.dish))).toBe(
      false,
    );
  });

  it("N: same input is deterministic", () => {
    const item = wine({ slug: "stable", alcohol: 13.8 });
    const first = generatePairingDrafts(item).map((row) => row.dish);
    const second = generatePairingDrafts(item).map((row) => row.dish);
    expect(second).toEqual(first);
  });

  it("O: editorial prose changes do not alter ranking", () => {
    const left = generatePairingDrafts(
      wine({
        slug: "copy-a",
        descriptionEditorial: "Text A despre peisaj.",
      }),
    ).map((row) => row.dish);
    const right = generatePairingDrafts(
      wine({
        slug: "copy-b",
        descriptionEditorial: "Alt text, fara date noi.",
      }),
    ).map((row) => row.dish);
    expect(right).toEqual(left);
  });

  it("P: Value/Gift/Food stored scores remain unchanged", () => {
    const item = wine({ slug: "scores", valueScore: 69, giftScore: 64, foodMatchScore: 74 });
    generatePairingDrafts(item);
    expect(item.valueScore).toBe(69);
    expect(item.giftScore).toBe(64);
    expect(item.foodMatchScore).toBe(74);
    const patch = buildCurationWritePatch(toApprovedFoodPairings([], item.foodPairings));
    expect("valueScore" in patch).toBe(false);
  });

  it("Q: SECONDARY_SCORING_MODE remains shadow", () => {
    generatePairingDrafts(wine({ slug: "shadow" }));
    expect(getSecondaryScoringMode()).toBe("shadow");
  });

  it("rationales avoid internal jargon and sensory invention", () => {
    const drafts = generatePairingDrafts(wine({ slug: "copy" }));
    expect(
      drafts.every(
        (row) =>
          !/asociere editoriala|judecata editoriala|stil verificat sustine|alcoolul verificat/i.test(
            row.rationale,
          ),
      ),
    ).toBe(true);
    expect(drafts.every((row) => !/tanin|stejar|barrique/i.test(row.rationale))).toBe(
      true,
    );
  });
});
