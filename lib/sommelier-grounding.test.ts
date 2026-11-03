import { describe, expect, it } from "vitest";
import { extractBudgetConstraint } from "@/lib/sommelier-budget";
import {
  evaluateSommelierGrounding,
  extractSpecificReferences,
  isAdvisoryQuestion,
  looksLikeSpecificReferenceRequest,
  matchReferenceInCatalog,
  type CatalogIdentity,
} from "@/lib/sommelier-grounding";

const SELENE: CatalogIdentity = {
  slug: "selene-feteasca-neagra-2024",
  name: "Selene Feteasca Neagra 2024",
  type: "red",
  wineryName: "Crama Recas",
  grapes: ["Feteasca Neagra"],
  vintage: 2024,
};

const BOHOTIN: CatalogIdentity = {
  slug: "vincon-busuioaca-de-bohotin",
  name: "Busuioaca de Bohotin",
  type: "rose",
  wineryName: "Vincon",
  grapes: ["Busuioaca de Bohotin"],
  vintage: 2023,
};

const PURCARI: CatalogIdentity = {
  slug: "purcari-feteasca-neagra",
  name: "Purcari Feteasca Neagra",
  type: "red",
  wineryName: "Chateau Purcari",
  grapes: ["Feteasca Neagra"],
  vintage: 2022,
};

const NO_BUDGET = extractBudgetConstraint("");

describe("extractSpecificReferences", () => {
  it("extracts both sides of a comparison", () => {
    const references = extractSpecificReferences(
      "Busuioaca de Bohotin sau Sange de Taur?",
    );
    expect(references.map((reference) => reference.tokens)).toEqual([
      ["busuioaca", "bohotin"],
      ["sange", "taur"],
    ]);
  });

  it("extracts a lookup after 'aveti'", () => {
    const references = extractSpecificReferences("Aveti Feteasca Neagra?");
    expect(references).toHaveLength(1);
    expect(references[0]?.tokens).toEqual(["feteasca", "neagra"]);
  });

  it("ignores food and colour comparisons", () => {
    expect(extractSpecificReferences("Sarmale sau gratar?")).toHaveLength(0);
    expect(extractSpecificReferences("Un vin rosu sau alb?")).toHaveLength(0);
  });

  it("ignores generic commerce comparisons", () => {
    expect(extractSpecificReferences("Cadou sau pentru mine?")).toHaveLength(0);
  });

  it("does not treat a budget as a product", () => {
    expect(extractSpecificReferences("Ceva bun sub 80 de lei?")).toHaveLength(0);
  });

  it("does not treat fillers as a product", () => {
    expect(extractSpecificReferences("Aveti vreo recomandare?")).toHaveLength(0);
    expect(extractSpecificReferences("Aveti vinuri din Romania?")).toHaveLength(0);
    expect(extractSpecificReferences("Cadou sau pentru sotie?")).toHaveLength(0);
  });

  it("keeps a grape name after an action verb", () => {
    const references = extractSpecificReferences("Vreau sa incerc un Riesling");
    expect(references).toHaveLength(1);
    expect(references[0]?.tokens).toEqual(["riesling"]);
  });

  it("flags messages that need a catalog lookup", () => {
    expect(looksLikeSpecificReferenceRequest("Feteasca Neagra sau Merlot?")).toBe(
      true,
    );
    expect(looksLikeSpecificReferenceRequest("Ce vin merge cu paste?")).toBe(false);
  });
});

describe("matchReferenceInCatalog", () => {
  it("matches diacritics-insensitive names", () => {
    const [reference] = extractSpecificReferences("Busuioaca de Bohotin sau x");
    expect(reference).toBeDefined();
    const matches = matchReferenceInCatalog(reference!, [BOHOTIN, SELENE]);
    expect(matches.map((entry) => entry.slug)).toContain(BOHOTIN.slug);
  });

  it("matches a producer name", () => {
    const [reference] = extractSpecificReferences("Ce parere ai despre Purcari?");
    const matches = matchReferenceInCatalog(reference!, [PURCARI, SELENE]);
    expect(matches.map((entry) => entry.slug)).toContain(PURCARI.slug);
  });

  it("matches a region name", () => {
    const withRegion: CatalogIdentity = {
      ...SELENE,
      regionName: "Dealu Mare",
    };
    const references = extractSpecificReferences("Aveti vinuri din Dealu Mare?");
    expect(references).toHaveLength(1);
    const matches = matchReferenceInCatalog(references[0]!, [withRegion]);
    expect(matches.map((entry) => entry.slug)).toContain(SELENE.slug);
  });
});

describe("evaluateSommelierGrounding: no substitution for missing wines", () => {
  it("suppresses recommendations when a compared wine is not in the catalog", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Busuioaca de Bohotin sau Sange de Taur?",
      candidates: [SELENE],
      catalog: [SELENE, PURCARI],
      budget: NO_BUDGET,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("specific_reference_unavailable");
    expect(decision.restrictToSlugs).toEqual([]);
    expect(decision.references).toHaveLength(2);
  });

  it("restricts to the named wines when they exist", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Busuioaca de Bohotin sau Sange de Taur?",
      candidates: [SELENE],
      catalog: [SELENE, BOHOTIN],
      budget: NO_BUDGET,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("ok");
    expect(decision.restrictToSlugs).toContain(BOHOTIN.slug);
    expect(decision.restrictToSlugs).not.toContain(SELENE.slug);
  });

  it("does not claim a wine is missing when the catalog index is unavailable", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Busuioaca de Bohotin sau Sange de Taur?",
      candidates: [SELENE],
      catalog: null,
      budget: NO_BUDGET,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.notes).toContain("catalog_index_unavailable");
  });

  it("fails closed when the catalog index is unavailable and nothing was retrieved", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Aveti Busuioaca de Bohotin?",
      candidates: [],
      catalog: null,
      budget: NO_BUDGET,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("catalog_unavailable");
  });
});

describe("evaluateSommelierGrounding: empty results", () => {
  it("suppresses when a hard budget excludes everything", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Vreau un vin rosu",
      candidates: [],
      catalog: null,
      budget: extractBudgetConstraint("maxim 30 de lei"),
      color: "red",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("budget_excludes_all");
  });

  it("suppresses when constraints exclude everything", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Vreau un vin alb",
      candidates: [],
      catalog: null,
      budget: NO_BUDGET,
      color: "white",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("constraints_exclude_all");
  });

  it("suppresses when nothing matched and no constraint was stated", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Ce vin merge cu ceva?",
      candidates: [],
      catalog: null,
      budget: NO_BUDGET,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("no_candidates");
  });

  it("allows recommendations when candidates exist and no specific wine was named", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Ce vin merge cu sarmale?",
      candidates: [SELENE],
      catalog: null,
      budget: NO_BUDGET,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.restrictToSlugs).toBeNull();
  });
});

describe("advisory questions", () => {
  it("detects learning questions so a recommendation is optional", () => {
    expect(isAdvisoryQuestion("Ce este Feteasca Neagra?")).toBe(true);
    expect(isAdvisoryQuestion("Care este diferenta dintre cele doua?")).toBe(true);
    expect(isAdvisoryQuestion("Vreau un vin pentru sarmale")).toBe(false);
  });

  it("marks advisory mode without blocking catalog recommendations", () => {
    const decision = evaluateSommelierGrounding({
      userMessage: "Ce este Feteasca Neagra?",
      candidates: [SELENE],
      catalog: [SELENE],
      budget: NO_BUDGET,
    });
    expect(decision.advisoryOnly).toBe(true);
    expect(decision.allowed).toBe(true);
  });
});
