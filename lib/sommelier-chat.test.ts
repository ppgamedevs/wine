import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/sommelier-rag", () => ({
  hybridRetrieve: vi.fn(async () => []),
}));

import {
  buildChatSommelierSystemPrompt,
  parseChatToSommelierInput,
  parseSommelierRequest,
} from "@/lib/sommelier-chat";
import type { WineWithRelations } from "@/types";
import type { GroundingDecision } from "@/lib/sommelier-grounding";
import {
  compareToExpected,
  parseEvaluationFixture,
  type EvaluationInterpretation,
} from "@/lib/jev/evaluation";

const WINE = {
  id: 1,
  slug: "selene-feteasca-neagra-2024",
  name: "Selene Feteasca Neagra 2024",
  type: "red",
  vintage: 2024,
  sweetness: "sec",
  currentPrice: 79,
  priceAvg: 79,
  affiliateLinks: [
    {
      retailer: "eMAG.ro",
      url: "https://l.profitshare.ro/l/100001",
      priceRon: 79,
      checkedAt: new Date().toISOString(),
      inStock: true,
    },
  ],
  priceHistory: [],
  valueScore: 79,
  giftScore: null,
  foodMatchScore: null,
  grapeVarieties: [{ name: "Feteasca Neagra" }],
  winery: { name: "Crama Recas", slug: "crama-recas" },
  region: { name: "Dealu Mare" },
  medals: [],
  producerContent: null,
  foodPairingNotes: [],
  dessertPairings: [],
  ratingAvg: null,
  communityScore: null,
} as unknown as WineWithRelations;

describe("parseSommelierRequest: deterministic interpretation", () => {
  it("parses the budget with the 'de' particle", () => {
    const parsed = parseSommelierRequest(
      "Vreau un vin alb pentru paste, maxim 80 de lei",
    );
    expect(parsed.budget.budgetSpecified).toBe(true);
    expect(parsed.budget.budgetMax).toBe(80);
    expect(parsed.budget.budgetConstraint).toBe("hard");
    expect(parsed.input.budgetMax).toBe(80);
    expect(parsed.input.budgetConstraint).toBe("hard");
  });

  it("detects the dish and keeps the occasion unknown", () => {
    const parsed = parseSommelierRequest(
      "Vreau un vin pentru o cina romantica, mancam paste cu sos alb",
    );
    expect(parsed.dishReference?.dish).toBe("paste");
    expect(parsed.input.dish).toBe("paste");
    expect(parsed.input.occasion).toBe("cina-romantica");
  });

  it("does not treat pasta as Easter", () => {
    const parsed = parseSommelierRequest("Ce vin merge cu paste?");
    expect(parsed.input.occasion).toBe("oricare");
    expect(parsed.input.dish).toBe("paste");
  });

  it("keeps 'de Paste' as a holiday", () => {
    const parsed = parseSommelierRequest("Vin pentru masa de Paste");
    expect(parsed.input.occasion).toBe("sarbatori");
  });

  it("extracts an acidity exclusion", () => {
    const parsed = parseSommelierRequest(
      "Nu vreau ceva foarte acid, imi recomanzi un vin?",
    );
    expect(parsed.input.acidityPreference).toBe("low");
    expect(parsed.exclusions.detected).toBe(true);
  });

  it("does not treat 'sos alb' as a white wine request", () => {
    const parsed = parseSommelierRequest(
      "Vreau un vin pentru o cina romantica, mancam paste cu sos alb",
    );
    expect(parsed.input.color).toBe("any");
    expect(parsed.dishReference?.dish).toBe("paste");
  });

  it("does not treat 'nu vreau prea dulce' as a sweet request", () => {
    const parsed = parseSommelierRequest("Nu vreau prea dulce, ce imi recomanzi?");
    expect(parsed.input.sweetness).toBe("any");
    expect(parsed.input.exclusions?.sweetness).toContain("dulce");
  });

  it("does not turn a negated colour into a preference", () => {
    const parsed = parseSommelierRequest("Vreau un vin, dar nu rosu");
    expect(parsed.input.color).toBe("any");
    expect(parsed.input.exclusions?.colors).toContain("red");
  });

  it("keeps contradictory colour requests unresolved", () => {
    const parsed = parseSommelierRequest("Un vin rosu sau alb pentru gratar");
    expect(parsed.input.color).toBe("any");
    expect(parsed.input.contradictoryColor).toBe(true);
  });

  it("marks the intent source as deterministic", () => {
    const input = parseChatToSommelierInput("Ce vin merge cu sarmale?");
    expect(input.intentSource).toBe("deterministic");
  });
});

describe("buildChatSommelierSystemPrompt: grounding instructions", () => {
  const baseInput = parseChatToSommelierInput("Busuioaca de Bohotin sau Sange de Taur?");

  it("forbids recommendations when the named wine is not in the catalog", () => {
    const grounding: GroundingDecision = {
      allowed: false,
      reason: "specific_reference_unavailable",
      restrictToSlugs: [],
      references: [],
      advisoryOnly: true,
      notes: [],
    };
    const prompt = buildChatSommelierSystemPrompt([], baseInput, "ro", {
      grounding,
    });
    expect(prompt).toContain("NU exista in catalogul VinIntel");
    expect(prompt).toContain("NU scrie linia RECOMMENDED_SLUGS");
    expect(prompt).not.toContain("RECOMMENDED_SLUGS trebuie sa contina");
  });

  it("forbids exceeding an explicit budget", () => {
    const input = parseChatToSommelierInput("Vreau un vin rosu, maxim 80 de lei");
    const prompt = buildChatSommelierSystemPrompt([WINE], input, "ro");
    expect(prompt).toContain("pana la 80 RON");
    expect(prompt).toContain("NU recomanda peste buget");
  });

  it("restricts recommendations to the named slugs", () => {
    const grounding: GroundingDecision = {
      allowed: true,
      reason: "ok",
      restrictToSlugs: ["selene-feteasca-neagra-2024"],
      references: [],
      advisoryOnly: false,
      notes: [],
    };
    const prompt = buildChatSommelierSystemPrompt([WINE], baseInput, "ro", {
      grounding,
    });
    expect(prompt).toContain("selene-feteasca-neagra-2024");
    expect(prompt).toContain("Poti recomanda DOAR slug-urile");
  });

  it("does not force a recommendation for an advisory question", () => {
    const grounding: GroundingDecision = {
      allowed: true,
      reason: "ok",
      restrictToSlugs: null,
      references: [],
      advisoryOnly: true,
      notes: [],
    };
    const prompt = buildChatSommelierSystemPrompt([WINE], baseInput, "ro", {
      grounding,
    });
    expect(prompt).toContain("cere in primul rand o explicatie");
  });

  it("never exposes Jev intent when it is not supplied (shadow mode)", () => {
    const prompt = buildChatSommelierSystemPrompt([WINE], baseInput, "ro");
    expect(prompt).not.toContain("Interpretare semantica");
  });
});

describe("buildChatSommelierSystemPrompt: catalog facts only", () => {
  it("serializes only stored wine facts and canonical scores", () => {
    const input = parseChatToSommelierInput("Recomanda un vin rosu");
    const prompt = buildChatSommelierSystemPrompt([WINE], input, "ro");
    expect(prompt).toContain("Value 79/100");
    expect(prompt).toContain("Pret: 79 RON");
    expect(prompt).toContain("Nume: Selene Feteasca Neagra 2024");
    expect(WINE.valueScore).toBe(79);
  });
});

describe("evaluation fixture consistency", () => {
  function deterministicInterpretation(message: string): EvaluationInterpretation {
    const parsed = parseSommelierRequest(message, [], "ro");
    return {
      fields: {
        occasion: parsed.input.occasion,
        color: parsed.input.color,
        sweetness: parsed.input.sweetness,
        acidity: parsed.input.acidityPreference ?? null,
        body: parsed.input.bodyPreference ?? null,
        budgetSpecified: parsed.budget.budgetSpecified,
        budgetMin: parsed.budget.budgetSpecified ? parsed.budget.budgetMin : null,
        budgetMax: parsed.budget.budgetSpecified ? parsed.budget.budgetMax : null,
      },
    };
  }

  it("keeps reference labels in sync with the deterministic parser", () => {
    const fixturePath = path.resolve(
      process.cwd(),
      "data/jev-eval/sommelier-intent.fixture.json",
    );
    const cases = parseEvaluationFixture(
      JSON.parse(readFileSync(fixturePath, "utf8")) as unknown,
    );
    expect(cases.length).toBeGreaterThanOrEqual(16);

    const failures: string[] = [];
    for (const testCase of cases) {
      if (testCase.labelStatus !== "deterministic_reference") continue;
      const mismatches = compareToExpected(
        deterministicInterpretation(testCase.message),
        testCase.expected,
      ).filter((comparison) => !comparison.match);
      for (const mismatch of mismatches) {
        failures.push(
          `${testCase.id}:${mismatch.field} expected ${String(mismatch.expected)} got ${String(mismatch.actual)}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
