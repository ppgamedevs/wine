import { describe, expect, it } from "vitest";
import {
  EMPTY_BUDGET,
  SOMMELIER_NO_BUDGET_MAX,
  extractBudgetConstraint,
  priceSatisfiesBudget,
} from "@/lib/sommelier-budget";

describe("extractBudgetConstraint: maximum budget", () => {
  it("parses 'maxim 80 de lei' (with the 'de' particle)", () => {
    const budget = extractBudgetConstraint("Vreau un vin alb, maxim 80 de lei");
    expect(budget.budgetSpecified).toBe(true);
    expect(budget.budgetConstraint).toBe("hard");
    expect(budget.budgetMax).toBe(80);
    expect(budget.budgetMin).toBe(0);
    expect(budget.exclusiveMax).toBe(false);
  });

  it("parses 'maxim 80 lei' without the particle", () => {
    const budget = extractBudgetConstraint("maxim 80 lei");
    expect(budget.budgetMax).toBe(80);
    expect(budget.budgetConstraint).toBe("hard");
  });

  it("parses 'pana la 60 de lei'", () => {
    const budget = extractBudgetConstraint("Un vin bun pana la 60 de lei");
    expect(budget.budgetMax).toBe(60);
    expect(budget.budgetSpecified).toBe(true);
  });

  it("parses english 'under 60 RON' as a strict cap", () => {
    const budget = extractBudgetConstraint("recommend a wine under 60 RON");
    expect(budget.budgetMax).toBe(60);
    expect(budget.exclusiveMax).toBe(true);
  });

  it("keeps 'sub 70 de lei' exclusive", () => {
    const budget = extractBudgetConstraint("sub 70 de lei");
    expect(budget.budgetMax).toBe(70);
    expect(budget.exclusiveMax).toBe(true);
    expect(priceSatisfiesBudget(69, budget)).toBe(true);
    expect(priceSatisfiesBudget(70, budget)).toBe(false);
  });

  it("treats a bare 'maxim 80' as RON but records the assumption", () => {
    const budget = extractBudgetConstraint("maxim 80");
    expect(budget.budgetMax).toBe(80);
    expect(budget.budgetSpecified).toBe(true);
    expect(budget.notes).toContain("currency_assumed_ron");
  });
});

describe("extractBudgetConstraint: ranges and minimums", () => {
  it("parses 'intre 50 si 100 lei'", () => {
    const budget = extractBudgetConstraint("caut ceva intre 50 si 100 lei");
    expect(budget.budgetSpecified).toBe(true);
    expect(budget.budgetMin).toBe(50);
    expect(budget.budgetMax).toBe(100);
    expect(budget.budgetConstraint).toBe("hard");
  });

  it("parses '50-100 lei'", () => {
    const budget = extractBudgetConstraint("50-100 lei");
    expect(budget.budgetMin).toBe(50);
    expect(budget.budgetMax).toBe(100);
  });

  it("handles diacritics and missing diacritics identically", () => {
    const withDiacritics = extractBudgetConstraint("între 50 și 100 lei");
    const withoutDiacritics = extractBudgetConstraint("intre 50 si 100 lei");
    expect(withDiacritics.budgetMin).toBe(withoutDiacritics.budgetMin);
    expect(withDiacritics.budgetMax).toBe(withoutDiacritics.budgetMax);
  });

  it("rejects an inverted range instead of inventing one", () => {
    const budget = extractBudgetConstraint("intre 100 si 50 lei");
    expect(budget.budgetSpecified).toBe(false);
  });
});

describe("extractBudgetConstraint: approximate and absent", () => {
  it("treats 'in jur de 80 lei' as approximate", () => {
    const budget = extractBudgetConstraint("in jur de 80 lei");
    expect(budget.budgetConstraint).toBe("approximate");
    expect(budget.budgetMax).toBe(80);
  });

  it("treats a bare '80 lei' as an approximate price target", () => {
    const budget = extractBudgetConstraint("vreau ceva de 80 lei");
    expect(budget.budgetSpecified).toBe(true);
    expect(budget.budgetConstraint).toBe("approximate");
  });

  it("returns no constraint when no budget is stated", () => {
    const budget = extractBudgetConstraint("Ce vin merge cu sarmale?");
    expect(budget.budgetSpecified).toBe(false);
    expect(budget.budgetConstraint).toBe("none");
    expect(budget.budgetMax).toBe(SOMMELIER_NO_BUDGET_MAX);
  });

  it("does not invent a budget from a year", () => {
    const budget = extractBudgetConstraint("Feteasca Neagra 2024");
    expect(budget.budgetSpecified).toBe(false);
  });

  it("does not convert foreign currency", () => {
    const budget = extractBudgetConstraint("buget 500 de euro");
    expect(budget.budgetSpecified).toBe(false);
    expect(budget.ambiguousCurrency).toBe(true);
    expect(budget.notes).toContain("foreign_currency_not_converted");
  });

  it("ignores implausible amounts", () => {
    const budget = extractBudgetConstraint("maxim 10 lei");
    expect(budget.budgetSpecified).toBe(false);
  });

  it("returns a fresh object, not the shared empty constant", () => {
    const budget = extractBudgetConstraint("");
    expect(budget).not.toBe(EMPTY_BUDGET);
    expect(budget).toEqual(EMPTY_BUDGET);
  });
});

describe("priceSatisfiesBudget: hard budget cannot be exceeded", () => {
  const budget = extractBudgetConstraint("maxim 80 de lei");

  it("accepts a price exactly at the cap", () => {
    expect(priceSatisfiesBudget(80, budget)).toBe(true);
  });

  it("rejects one leu above the cap", () => {
    expect(priceSatisfiesBudget(80.01, budget)).toBe(false);
  });

  it("treats 'sub 30' as strictly below 30", () => {
    const strict = extractBudgetConstraint("sub 30 de lei");
    expect(strict.budgetMax).toBe(30);
    expect(strict.exclusiveMax).toBe(true);
    expect(priceSatisfiesBudget(30, strict)).toBe(false);
    expect(priceSatisfiesBudget(29.99, strict)).toBe(true);
  });

  it("rejects unknown prices under a hard budget", () => {
    expect(priceSatisfiesBudget(null, budget)).toBe(false);
    expect(priceSatisfiesBudget(undefined, budget)).toBe(false);
  });

  it("allows a small tolerance only for approximate budgets", () => {
    const approximate = extractBudgetConstraint("in jur de 80 lei");
    expect(priceSatisfiesBudget(86, approximate)).toBe(true);
    expect(priceSatisfiesBudget(95, approximate)).toBe(false);
  });

  it("does not constrain prices when no budget was stated", () => {
    const none = extractBudgetConstraint("ce vin merge cu paste?");
    expect(priceSatisfiesBudget(500, none)).toBe(true);
    expect(priceSatisfiesBudget(null, none)).toBe(true);
  });

  it("enforces a minimum price", () => {
    const range = extractBudgetConstraint("intre 50 si 100 lei");
    expect(priceSatisfiesBudget(49, range)).toBe(false);
    expect(priceSatisfiesBudget(50, range)).toBe(true);
    expect(priceSatisfiesBudget(100, range)).toBe(true);
    expect(priceSatisfiesBudget(101, range)).toBe(false);
  });
});
