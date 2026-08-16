import { describe, expect, it } from "vitest";
import {
  evidenceContextFromPairingFields,
  type PairingEvidenceContext,
} from "@/lib/curated-evidence";
import {
  generatePairingDrafts,
  lockDraftBasis,
  validatePairingDrafts,
} from "@/lib/pairing-curation";
import {
  RELATED_PRODUCER_NOTICE,
  classifyProducerProvenance,
  resolveDraftProducerProvenance,
} from "@/lib/pairing/producer-provenance";
import { scoreRomanianPairingLibrary } from "@/lib/pairing/generate-romanian-drafts";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type { WineWithRelations } from "@/types";

function wine(
  overrides: Partial<WineWithRelations> & { slug: string },
): WineWithRelations {
  const { slug, ...rest } = overrides;
  return {
    id: 44,
    name: slug,
    slug,
    type: "rose",
    sweetness: "sec",
    status: "verified",
    foodPairings: [],
    producerContent: null,
    grapeVarieties: [{ name: "Merlot" }],
    valueScore: 70,
    giftScore: 60,
    foodMatchScore: 50,
    alcohol: 13,
    winery: { name: "Recas", slug: "cramele-recas" },
    ...rest,
  } as WineWithRelations;
}

function contextFromWine(item: WineWithRelations): PairingEvidenceContext {
  return evidenceContextFromPairingFields({
    type: item.type,
    sweetness: item.sweetness,
    alcohol: item.alcohol,
    acidity: item.acidity,
    producerCulinaryPairings: item.producerContent?.culinaryPairings,
    foodEvidence: item.producerContent?.foodEvidence,
    culinaryLaundryRejected: item.producerContent?.culinaryLaundryRejected,
    culinaryChromeRejected: item.producerContent?.culinaryChromeRejected,
  });
}

function claim(
  category: string,
  dish: string,
  excerpt = `Se recomanda cu ${dish}.`,
) {
  return {
    category,
    dish,
    sourceType: "producer_page" as const,
    excerpt,
    extractionMethod: "deterministic" as const,
    evidenceClass: "PRODUCER_EXACT",
    confidence: 80,
  };
}

function draft(overrides: Partial<PairingDraft> = {}): PairingDraft {
  return {
    dish: "Rata pe varza",
    category: "poultry",
    rationale: "Un roze sec din acest stil poate tine pasul cu rata pe varza.",
    basis: ["producer_evidence", "verified_style", "editorial_judgment"],
    confidence: "HIGH",
    strength: "good",
    styleOnlyWarning: false,
    provenanceLocked: true,
    ...overrides,
  };
}

describe("pairing producer provenance lock", () => {
  it("A: producer curcan does not attribute Rata pe varza as producer_evidence", () => {
    const item = wine({
      slug: "curcan-rata",
      producerContent: {
        culinaryPairings: "Se recomanda cu curcan.",
        foodEvidence: [claim("poultry", "curcan")],
      },
    });
    const generated = generatePairingDrafts(item);
    const rata = generated.find((row) => row.dish === "Rata pe varza");
    if (rata) {
      expect(rata.basis.includes("producer_evidence")).toBe(false);
      expect(rata.producerProvenanceClass).toBe("RELATED_PRODUCER_CATEGORY");
      expect(rata.provenanceLocked).toBe(false);
    }
    expect(
      classifyProducerProvenance(contextFromWine(item), "Rata pe varza", "poultry"),
    ).toBe("RELATED_PRODUCER_CATEGORY");
    const resolved = resolveDraftProducerProvenance(draft(), contextFromWine(item));
    expect(resolved.basis.includes("producer_evidence")).toBe(false);
    expect(resolved.basis).toEqual(
      expect.arrayContaining(["verified_style", "editorial_judgment"]),
    );
    expect(validatePairingDrafts(item, [resolved]).some((row) => row.level === "error")).toBe(
      false,
    );
    expect(RELATED_PRODUCER_NOTICE).toContain("categorie apropiata");
  });

  it("B: producer peste does not attribute Plachie de crap as producer_evidence", () => {
    const item = wine({
      slug: "peste-plachie",
      type: "white",
      grapeVarieties: [{ name: "Sauvignon Blanc" }],
      producerContent: {
        culinaryPairings: "Se recomanda cu peste.",
        foodEvidence: [claim("fish", "peste")],
      },
    });
    expect(
      classifyProducerProvenance(contextFromWine(item), "Plachie de crap", "fish"),
    ).toBe("RELATED_PRODUCER_CATEGORY");
    const generated = generatePairingDrafts(item);
    const plachie = generated.find((row) => row.dish === "Plachie de crap");
    if (plachie) {
      expect(plachie.basis.includes("producer_evidence")).toBe(false);
    }
  });

  it("C: exact somon la gratar keeps producer_evidence", () => {
    const item = wine({
      slug: "somon-exact",
      type: "white",
      grapeVarieties: [{ name: "Chardonnay" }],
      producerContent: {
        culinaryPairings: "Se recomanda cu somon la gratar.",
        foodEvidence: [claim("fish", "somon la gratar")],
      },
    });
    expect(
      classifyProducerProvenance(contextFromWine(item), "Somon la gratar", "fish"),
    ).toBe("EXACT_PRODUCER");
    const locked = lockDraftBasis(
      item,
      draft({
        dish: "Somon la gratar",
        category: "fish",
        rationale: "Producatorul mentioneaza somon la gratar.",
      }),
    );
    expect(locked.basis.includes("producer_evidence")).toBe(true);
  });

  it("D: fructe de mare is related category for Hamsii prajite", () => {
    const item = wine({
      slug: "seafood-hamsii",
      type: "white",
      grapeVarieties: [{ name: "Sauvignon Blanc" }],
      producerContent: {
        culinaryPairings: "Se recomanda cu fructe de mare.",
        foodEvidence: [claim("fish", "fructe de mare")],
      },
    });
    expect(
      classifyProducerProvenance(contextFromWine(item), "Hamsii prajite", "fish"),
    ).toBe("RELATED_PRODUCER_CATEGORY");
    const resolved = resolveDraftProducerProvenance(
      draft({
        dish: "Hamsii prajite",
        category: "fish",
        rationale: "Un alb sec se potriveste cu hamsii prajite.",
      }),
      contextFromWine(item),
    );
    expect(resolved.basis.includes("producer_evidence")).toBe(false);
    expect(resolved.dish).toBe("Hamsii prajite");
    expect(resolved.rationale).toContain("hamsii");
    expect(resolved.strength).toBe("good");
  });

  it("E: server still rejects forged producer_evidence", () => {
    const item = wine({
      slug: "forged",
      producerContent: {
        culinaryPairings: "Se recomanda cu curcan.",
        foodEvidence: [claim("poultry", "curcan")],
      },
    });
    const forged = draft();
    expect(
      validatePairingDrafts(item, [forged]).some((row) => row.code === "fake_producer_basis"),
    ).toBe(true);
    expect(() => lockDraftBasis(item, forged)).toThrow(/producer_evidence/);
    const empty = wine({ slug: "no-evidence" });
    expect(() => lockDraftBasis(empty, forged)).toThrow(/producer_evidence/);
  });

  it("related category still boosts compatibility without exact attribution", () => {
    const base = scoreRomanianPairingLibrary(wine({ slug: "no-boost" }));
    const boosted = scoreRomanianPairingLibrary(
      wine({
        slug: "boost-curcan",
        producerContent: {
          culinaryPairings: "Se recomanda cu curcan.",
          foodEvidence: [claim("poultry", "curcan")],
        },
      }),
    );
    const before = base.find((row) => row.dish.id === "rata-pe-varza")?.score ?? 0;
    const after = boosted.find((row) => row.dish.id === "rata-pe-varza")?.score ?? 0;
    expect(after).toBeGreaterThan(before);
    expect(
      generatePairingDrafts(
        wine({
          slug: "boost-curcan-drafts",
          producerContent: {
            culinaryPairings: "Se recomanda cu curcan.",
            foodEvidence: [claim("poultry", "curcan")],
          },
        }),
      ).some(
        (row) =>
          row.dish === "Rata pe varza" && row.basis.includes("producer_evidence"),
      ),
    ).toBe(false);
  });

  it("branzeturi semitari exact mention stays producer_evidence", () => {
    const item = wine({
      slug: "cheese-exact",
      producerContent: {
        culinaryPairings: "Se recomanda cu branzeturi semitari.",
        foodEvidence: [claim("cheese", "branzeturi semitari")],
      },
    });
    expect(
      classifyProducerProvenance(
        contextFromWine(item),
        "Branzeturi semitari",
        "cheese",
      ),
    ).toBe("EXACT_PRODUCER");
  });
});
