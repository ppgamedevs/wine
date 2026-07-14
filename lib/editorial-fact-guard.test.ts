import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CANONICAL_GRAPES = ["Feteasca Neagra", "Cabernet Sauvignon", "Merlot"];
const CANONICAL_REGIONS = ["Dealu Mare", "Cotnari", "Murfatlar"];

/**
 * `editorial-fact-guard.ts` caches canonical grape/region names at module
 * scope, so each test resets modules and re-mocks `@/lib/db` to get a clean,
 * deterministic, DB-free instance of the module under test.
 */
async function loadFactGuard() {
  vi.resetModules();
  vi.doMock("@/lib/db", () => ({
    db: {
      query: {
        grapeVarieties: {
          findMany: vi.fn().mockResolvedValue(
            CANONICAL_GRAPES.map((name) => ({ name })),
          ),
        },
        regions: {
          findMany: vi.fn().mockResolvedValue(
            CANONICAL_REGIONS.map((name) => ({ name })),
          ),
        },
      },
    },
  }));
  return import("@/lib/editorial-fact-guard");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/lib/db");
});

describe("validateEditorialAgainstFacts", () => {
  it("accepts editorial text that only reformulates the wine's own declared grape", async () => {
    const { validateEditorialAgainstFacts } = await loadFactGuard();
    const result = await validateEditorialAgainstFacts(
      {
        descriptionEditorial:
          "Un vin echilibrat de Feteasca Neagra, cu taninuri fine.",
      },
      { grapeVarieties: ["Feteasca Neagra"], regionName: "Dealu Mare" },
    );
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("rejects editorial text that introduces a grape variety absent from the facts", async () => {
    const { validateEditorialAgainstFacts } = await loadFactGuard();
    const result = await validateEditorialAgainstFacts(
      {
        descriptionEditorial:
          "Acest cupaj de Cabernet Sauvignon si Merlot este delicios.",
      },
      { grapeVarieties: ["Feteasca Neagra"], regionName: "Dealu Mare" },
    );
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.includes("Cabernet Sauvignon"))).toBe(
      true,
    );
  });

  it("rejects editorial text that introduces a region absent from the facts", async () => {
    const { validateEditorialAgainstFacts } = await loadFactGuard();
    const result = await validateEditorialAgainstFacts(
      { descriptionEditorial: "Un vin tipic din Cotnari." },
      { grapeVarieties: ["Feteasca Neagra"], regionName: "Dealu Mare" },
    );
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.includes("Cotnari"))).toBe(true);
  });

  it("rejects award/medal mentions when the wine has no recorded medals", async () => {
    const { validateEditorialAgainstFacts } = await loadFactGuard();
    const result = await validateEditorialAgainstFacts(
      { descriptionEditorial: "Vinul a primit medalie de aur la un concurs." },
      { grapeVarieties: ["Feteasca Neagra"], regionName: "Dealu Mare", medals: [] },
    );
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.toLowerCase().includes("medalie"))).toBe(
      true,
    );
  });

  it("allows award mentions when the wine does have recorded medals", async () => {
    const { validateEditorialAgainstFacts } = await loadFactGuard();
    const result = await validateEditorialAgainstFacts(
      { descriptionEditorial: "Vinul a primit medalie de aur la un concurs." },
      {
        grapeVarieties: ["Feteasca Neagra"],
        regionName: "Dealu Mare",
        medals: [{ competition: "Concurs", medal: "gold" }],
      },
    );
    expect(result.ok).toBe(true);
  });

  it("does not flag generic color words (alb/rosu/roze) as fabricated grape mentions", async () => {
    const { validateEditorialAgainstFacts } = await loadFactGuard();
    const result = await validateEditorialAgainstFacts(
      { descriptionEditorial: "Un vin rosu robust cu arome de fructe coapte." },
      { grapeVarieties: ["Feteasca Neagra"], regionName: "Dealu Mare" },
    );
    expect(result.ok).toBe(true);
  });

  it("EditorialFactCheckError carries the violation list for callers to log", async () => {
    const { EditorialFactCheckError } = await loadFactGuard();
    const error = new EditorialFactCheckError(["motiv 1", "motiv 2"]);
    expect(error.violations).toEqual(["motiv 1", "motiv 2"]);
    expect(error.message).toContain("motiv 1");
  });
});
