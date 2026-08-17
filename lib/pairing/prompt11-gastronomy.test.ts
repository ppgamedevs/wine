import { describe, expect, it } from "vitest";
import { categorizeFoodText } from "@/lib/food-taxonomy";
import {
  isCulinaryChromeText,
  sanitizeCulinaryText,
} from "@/lib/culinary-extract";
import { mapDishToCanonical } from "@/lib/pairing/dish-canonicalize";
import { findRomanianDishes } from "@/lib/pairing/dish-search";
import {
  GOLDEN_CURATION_STATS,
  GOLDEN_CURATION_WINES,
  GOLDEN_HISTORICAL_REJECTIONS,
  goldenSpecificityPrior,
} from "@/lib/pairing/golden-curation-dataset";
import { classifyProducerText } from "@/lib/pairing/producer-text-class";
import { uniqueProducerExcerpts } from "@/lib/pairing/producer-evidence-display";
import { classifyProducerProvenance } from "@/lib/pairing/producer-provenance";
import { evidenceContextFromPairingFields } from "@/lib/curated-evidence";
import { scoreDishCompatibility } from "@/lib/pairing/dish-compatibility";
import { generatePairingDrafts } from "@/lib/pairing-curation";
import { buildCurationWritePatch, toApprovedFoodPairings } from "@/lib/pairing-curation";
import { auditPairingProvenance } from "@/lib/pairing/provenance-audit";
import {
  findRomanianDishByName,
  getRomanianDishById,
  ROMANIAN_DISHES,
  ROMANIAN_PAIRING_GENERATOR_VERSION,
} from "@/lib/pairing/romanian-dishes";
import { foldRomanianText } from "@/lib/pairing/romanian-text";
import { buildWinePairingProfile } from "@/lib/pairing/wine-pairing-profile";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: 88,
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

describe("Prompt 11 gastronomy intelligence", () => {
  it("A: public dish names use Romanian diacritics", () => {
    const names = ROMANIAN_DISHES.map((dish) => dish.name).join(" ");
    expect(names).toMatch(/ă|â|î|ș|ț/);
    expect(getRomanianDishById("tocanita-de-vanat")?.name).toBe("Tocăniță de vânat");
    expect(getRomanianDishById("rata-pe-varza")?.name).toBe("Rață pe varză");
  });

  it("B: accent-insensitive search works", () => {
    expect(findRomanianDishes("icre stiuca")[0]?.id).toBe("salata-de-icre-de-stiuca");
    expect(findRomanianDishes("rata varza")[0]?.id).toBe("rata-pe-varza");
    expect(findRomanianDishes("foi vita")[0]?.id).toBe("sarmale-in-foi-de-vita");
    expect(findRomanianDishes("branza capra")[0]?.id).toBe("telemea-de-capra");
    expect(findRomanianDishes("ciulama ciuperci")[0]?.id).toBe("ciulama-de-ciuperci");
  });

  it("C: cedilla and comma Romanian forms normalize equally", () => {
    expect(foldRomanianText("știucă")).toBe(foldRomanianText("ştiucă"));
    expect(foldRomanianText("ȘTIUCĂ")).toBe("stiuca");
  });

  it("D: sarmale variants have separate canonical IDs", () => {
    expect(getRomanianDishById("sarmale")?.id).toBe("sarmale");
    expect(getRomanianDishById("sarmale-in-foi-de-vita")?.id).toBe(
      "sarmale-in-foi-de-vita",
    );
    expect(getRomanianDishById("sarmale-de-post")?.id).toBe("sarmale-de-post");
  });

  it("E: all three sarmale variants map to broad sarmale", () => {
    expect(getRomanianDishById("sarmale")?.foodCategory).toBe("sarmale");
    expect(getRomanianDishById("sarmale-in-foi-de-vita")?.foodCategory).toBe("sarmale");
    expect(getRomanianDishById("sarmale-de-post")?.foodCategory).toBe("sarmale");
  });

  it("F: roe species are distinct", () => {
    expect(getRomanianDishById("salata-de-icre-de-crap")?.id).not.toBe(
      getRomanianDishById("salata-de-icre-de-stiuca")?.id,
    );
  });

  it("G: Telemea de capra remains broad cheese for scoring", () => {
    expect(getRomanianDishById("telemea-de-capra")?.foodCategory).toBe("cheese");
    expect(categorizeFoodText("Telemea de capra")).toContain("cheese");
  });

  it("H: serving accompaniment does not create a new Food category", () => {
    const mapped = mapDishToCanonical("Pui la ceaun cu paine de casa");
    expect(mapped.dishId).toBe("pui-la-ceaun");
    expect(mapped.servingVariantId).toBe("paine-de-casa");
    expect(categorizeFoodText("Pui la ceaun cu paine de casa")).toEqual(
      categorizeFoodText("Pui la ceaun"),
    );
  });

  it("I: Pui la ceaun with bread maps to canonical pui-la-ceaun", () => {
    expect(mapDishToCanonical("Pui la ceaun cu pâine de casă").dishId).toBe(
      "pui-la-ceaun",
    );
  });

  it("J: Mamaliga with branza remains canonical iconic dish", () => {
    expect(findRomanianDishByName("Mamaliga cu branza si smantana")?.id).toBe(
      "mamaliga-cu-branza-si-smantana",
    );
  });

  it("K: Ostropel remains one existing dish, no duplicate", () => {
    const ostropel = ROMANIAN_DISHES.filter((dish) => dish.id.includes("ostropel"));
    expect(ostropel).toHaveLength(1);
    expect(ostropel[0]?.tomatoRich).toBe(true);
  });

  it("L: chiftele marinate has tomato-rich traits distinct from fried chiftele", () => {
    const fried = getRomanianDishById("chiftele-prajite");
    const marinated = getRomanianDishById("chiftele-marinate-in-sos-de-rosii");
    expect(fried?.tomatoRich).toBeFalsy();
    expect(marinated?.tomatoRich).toBe(true);
    expect(fried?.family).not.toBe(marinated?.family);
  });

  it("M and N: ciorba acidity affects compatibility and punishes heavy red", () => {
    const soup = getRomanianDishById("ciorba-de-burta");
    expect(soup?.sour).toBe(true);
    const heavy = buildWinePairingProfile(
      wine({ slug: "heavy-red", alcohol: 14.5, grapeVarieties: [{ name: "Cabernet Sauvignon" }] }),
    );
    const white = buildWinePairingProfile(
      wine({
        slug: "fresh-white",
        type: "white",
        alcohol: 12.5,
        grapeVarieties: [{ name: "Feteasca Regala" }],
      }),
    );
    const heavyScore = scoreDishCompatibility(heavy, soup!).score;
    const whiteScore = scoreDishCompatibility(white, soup!).score;
    expect(whiteScore).toBeGreaterThan(heavyScore);
  });

  it("O: piftie de curcan != piftie de porc", () => {
    expect(getRomanianDishById("piftie-de-curcan")?.family).not.toBe(
      getRomanianDishById("piftie-de-porc")?.family,
    );
  });

  it("P: exact producer dish beats generic derivative", () => {
    const item = wine({
      slug: "uberland-like",
      producerContent: {
        culinaryPairings: "Se recomanda cu piept de rata.",
      },
    });
    const drafts = generatePairingDrafts(item);
    expect(drafts.some((draft) => draft.dish.toLowerCase().includes("piept"))).toBe(true);
    expect(
      drafts.find((draft) => draft.dish.toLowerCase().includes("piept"))?.basis,
    ).toContain("producer_evidence");
  });

  it("Q: related producer category cannot grant exact provenance", () => {
    const context = evidenceContextFromPairingFields({
      type: "red",
      producerCulinaryPairings: "Se recomanda cu curcan.",
    });
    expect(classifyProducerProvenance(context, "Rață pe varză", "poultry")).toBe(
      "RELATED_PRODUCER_CATEGORY",
    );
  });

  it("R: tasting description is not producer culinary recommendation", () => {
    expect(
      classifyProducerText(
        "Nuanțele mele sunt de un roșu-vișiniu. La nivel gustativ, te voi cuceri cu aromele intense de fructe de pădure. Notele fine de lemn și scorțișoară. Structură și corp.",
      ),
    ).toBe("PRODUCER_DESCRIPTION");
  });

  it("S: cookie/footer garbage is removed from display", () => {
    const text =
      "Acest site foloseste cookies. Manage consent. Cookieuri necesare. Politica de confidentialitate.";
    expect(isCulinaryChromeText(text)).toBe(true);
    expect(sanitizeCulinaryText(`Sarmale. ${text}`)).not.toMatch(/Manage consent/i);
  });

  it("T: repeated producer excerpt is deduplicated", () => {
    const excerpt =
      "Se recomanda cu vita, peste, branza si pasare la masa de seara.";
    const unique = uniqueProducerExcerpts([
      { dish: "vita", category: "beef", excerpt, sourceUrl: "https://example.com" },
      { dish: "peste", category: "fish", excerpt, sourceUrl: "https://example.com" },
      { dish: "branza", category: "cheese", excerpt, sourceUrl: "https://example.com" },
    ]);
    expect(unique).toHaveLength(1);
  });

  it("U: golden dataset does not make popular dishes universally rank higher", () => {
    expect(goldenSpecificityPrior("sarmale")).toBeLessThan(0);
    const white = generatePairingDrafts(
      wine({
        slug: "sb-white",
        type: "white",
        grapeVarieties: [{ name: "Sauvignon Blanc" }],
        alcohol: 12.8,
      }),
    );
    expect(white.every((draft) => draft.dish !== "Sarmale clasice")).toBe(true);
  });

  it("V: existing 30 curated records remain unchanged by dry-run mapping", () => {
    const before = GOLDEN_CURATION_WINES.map((item) =>
      item.pairings.map((pairing) => pairing.dish),
    );
    for (const item of GOLDEN_CURATION_WINES) {
      for (const pairing of item.pairings) {
        mapDishToCanonical(pairing.dish);
      }
    }
    const after = GOLDEN_CURATION_WINES.map((item) =>
      item.pairings.map((pairing) => pairing.dish),
    );
    expect(after).toEqual(before);
    expect(GOLDEN_HISTORICAL_REJECTIONS).toBe("unknown");
    expect(GOLDEN_CURATION_STATS.wines).toBe(30);
  });

  it("W: no secondary score writes from curation patch", () => {
    const patch = buildCurationWritePatch(
      toApprovedFoodPairings(
        [
          {
            dish: "Sarmale clasice",
            category: "sarmale",
            rationale: "Se potriveste foarte bine cu sarmalele clasice.",
            basis: ["verified_style", "editorial_judgment"],
            confidence: "MEDIUM",
            strength: "good",
            styleOnlyWarning: true,
            provenanceLocked: false,
          },
        ],
        [],
      ),
    );
    expect(Object.keys(patch)).toEqual(["foodPairings"]);
  });

  it("X: shadow remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
    expect(ROMANIAN_PAIRING_GENERATOR_VERSION).toBe(2);
  });

  it("explicit FN tocanita producer_evidence is not culinary-supported", () => {
    const item = wine({
      slug: "cramele-recas-explicit-feteasca-neagra-2023",
      name: "EXPLICIT Fetească neagră",
      producerContent: {
        culinaryPairings:
          "Nuanțele mele sunt de un roșu-vișiniu, cu reflexe violacee. La nivel gustativ, te voi cuceri cu aromele intense de fructe de pădure. Notele fine de lemn și scorțișoară. Sunt o Fetească neagră cu structură și corp.",
      },
      foodPairings: [
        {
          dish: "Tocăniță de vânat",
          category: "game",
          basis: ["producer_evidence", "verified_style", "editorial_judgment"],
          strength: "good",
          source: "vinintel_curated",
        },
      ],
    });
    const row = auditPairingProvenance(item, item.foodPairings[0]!);
    expect(row.classification).toBe("NO_CULINARY_SUPPORT");
    expect(row.proposedBasis?.includes("producer_evidence")).toBe(false);
    expect(item.foodPairings[0]?.basis).toContain("producer_evidence");
  });
});
