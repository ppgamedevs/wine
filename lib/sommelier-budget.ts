/**
 * Deterministic budget extraction for the AI Sommelier.
 *
 * Money is never inferred by the language model. This parser is the only source
 * of price constraints, and its output is applied as a hard filter before any
 * wine reaches the prompt.
 *
 * Supported shapes (Romanian with or without diacritics, plus English):
 *   "maxim 80 lei" / "maxim 80 de lei" / "pana la 80 de lei" / "cel mult 80 lei"
 *   "sub 70 de lei" / "under 60 RON"  -> strictly below
 *   "intre 50 si 100 lei" / "50-100 lei" / "between 50 and 100"
 *   "buget 100 de lei" / "buget de 100 lei"
 *   "in jur de 80 lei" / "aproximativ 80 de lei" / "around 80 RON"
 *
 * Ambiguity policy:
 *   - A bare number without currency or budget wording is not a budget.
 *   - A foreign currency (EUR) is reported, not converted.
 *   - Implausible values are ignored rather than clamped into a fake budget.
 */
export const SOMMELIER_NO_BUDGET_MAX = 9999;

const MIN_PLAUSIBLE_BUDGET = 15;
const MAX_PLAUSIBLE_BUDGET = 20_000;

export type BudgetConstraintKind = "hard" | "approximate" | "none";

export interface BudgetExtraction {
  budgetMin: number;
  budgetMax: number;
  budgetSpecified: boolean;
  budgetConstraint: BudgetConstraintKind;
  /** True for "sub 70 lei": the cap itself is excluded. */
  exclusiveMax: boolean;
  /** A number was given in a non-RON currency; no conversion is attempted. */
  ambiguousCurrency: boolean;
  notes: string[];
  matchedText: string | null;
}

export const EMPTY_BUDGET: BudgetExtraction = {
  budgetMin: 0,
  budgetMax: SOMMELIER_NO_BUDGET_MAX,
  budgetSpecified: false,
  budgetConstraint: "none",
  exclusiveMax: false,
  ambiguousCurrency: false,
  notes: [],
  matchedText: null,
};

export function normalizeBudgetText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = Number.parseInt(raw.replace(/[.\s]/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

interface AmountMatch {
  text: string;
  value: number;
  currency: "ron" | "other" | null;
}

const CURRENCY = String.raw`(lei|ron|euro|eur|€)`;

function currencyOf(raw: string | undefined): AmountMatch["currency"] {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value === "lei" || value === "ron") return "ron";
  return "other";
}

function plausible(value: number | null): value is number {
  return (
    value != null &&
    Number.isFinite(value) &&
    value >= MIN_PLAUSIBLE_BUDGET &&
    value <= MAX_PLAUSIBLE_BUDGET
  );
}

function matchRange(text: string): {
  min: AmountMatch;
  max: AmountMatch;
} | null {
  const between = text.match(
    new RegExp(
      String.raw`\b(?:intre|between)\s+(?:de\s+)?(\d{2,5})\s*(?:si|and|[-–—])\s*(\d{2,5})\s*(?:de\s+)?${CURRENCY}?`,
    ),
  );
  if (between) {
    const currency = currencyOf(between[3]);
    return {
      min: { text: between[0], value: toNumber(between[1]) ?? -1, currency },
      max: { text: between[0], value: toNumber(between[2]) ?? -1, currency },
    };
  }

  const dash = text.match(
    new RegExp(String.raw`\b(\d{2,5})\s*[-–—]\s*(\d{2,5})\s*(?:de\s+)?${CURRENCY}`),
  );
  if (dash) {
    const currency = currencyOf(dash[3]);
    return {
      min: { text: dash[0], value: toNumber(dash[1]) ?? -1, currency },
      max: { text: dash[0], value: toNumber(dash[2]) ?? -1, currency },
    };
  }

  return null;
}

function matchMax(text: string): (AmountMatch & { exclusive: boolean }) | null {
  const strict = text.match(
    new RegExp(
      String.raw`\b(?:strict\s+sub|sub|under|below|less than|mai putin de)\s+(?:de\s+)?(\d{2,5})\s*(?:de\s+)?${CURRENCY}?`,
    ),
  );
  if (strict) {
    return {
      text: strict[0],
      value: toNumber(strict[1]) ?? -1,
      currency: currencyOf(strict[2]),
      exclusive: true,
    };
  }

  const max = text.match(
    new RegExp(
      String.raw`\b(?:maxim(?:um)?|max|cel mult|pana la|nu mai mult de|up to|no more than)\s+(?:de\s+)?(\d{2,5})\s*(?:de\s+)?${CURRENCY}?`,
    ),
  );
  if (max) {
    return {
      text: max[0],
      value: toNumber(max[1]) ?? -1,
      currency: currencyOf(max[2]),
      exclusive: false,
    };
  }

  const budget = text.match(
    new RegExp(
      String.raw`\b(?:buget(?:ul)?|budget)\s*(?:de|of)?\s*(\d{2,5})\s*(?:de\s+)?${CURRENCY}?`,
    ),
  );
  if (budget) {
    return {
      text: budget[0],
      value: toNumber(budget[1]) ?? -1,
      currency: currencyOf(budget[2]),
      exclusive: false,
    };
  }

  return null;
}

function matchApproximate(text: string): AmountMatch | null {
  const approx = text.match(
    new RegExp(
      String.raw`\b(?:in jur de|aproximativ|around|about|roughly|vreo|cam)\s+(?:de\s+)?(\d{2,5})\s*(?:de\s+)?${CURRENCY}?`,
    ),
  );
  if (approx) {
    return {
      text: approx[0],
      value: toNumber(approx[1]) ?? -1,
      currency: currencyOf(approx[2]),
    };
  }

  // A bare amount with a RON marker ("80 lei") is a price target, not a cap.
  const bare = text.match(
    new RegExp(String.raw`\b(\d{2,5})\s*(?:de\s+)?${CURRENCY}(?!\w)`),
  );
  if (bare) {
    const value = toNumber(bare[1]) ?? -1;
    if (!plausible(value)) return null;
    return {
      text: bare[0],
      value,
      currency: currencyOf(bare[2]),
    };
  }

  return null;
}

/**
 * Extract the budget constraints from free text.
 * Returns `EMPTY_BUDGET` (no constraint) whenever the request is not specific.
 */
export function extractBudgetConstraint(raw: string): BudgetExtraction {
  if (!raw.trim()) return { ...EMPTY_BUDGET };

  const text = normalizeBudgetText(raw);
  const notes: string[] = [];

  if (/\b(?:euro|eur|€)\b/.test(text)) {
    notes.push("foreign_currency_not_converted");
  }

  const range = matchRange(text);
  if (range) {
    const min = range.min.value;
    const max = range.max.value;
    if (range.min.currency === "other") {
      notes.push("foreign_currency_not_converted");
      return {
        ...EMPTY_BUDGET,
        ambiguousCurrency: true,
        notes,
        matchedText: range.min.text,
      };
    }
    if (plausible(min) && plausible(max) && max >= min) {
      if (max - min > 5_000) {
        notes.push("range_too_wide_ignored");
        return { ...EMPTY_BUDGET, notes };
      }
      return {
        budgetMin: min,
        budgetMax: max,
        budgetSpecified: true,
        budgetConstraint: "hard",
        exclusiveMax: false,
        ambiguousCurrency: notes.includes("foreign_currency_not_converted"),
        notes,
        matchedText: range.min.text,
      };
    }
    notes.push("range_implausible_ignored");
    // Do not fall through to a bare amount: an inverted range must not become
    // a different budget.
    return { ...EMPTY_BUDGET, notes };
  }

  const max = matchMax(text);
  if (max) {
    if (!plausible(max.value)) {
      notes.push("budget_implausible_ignored");
      return { ...EMPTY_BUDGET, notes };
    }
    if (max.currency === "other") {
      notes.push("foreign_currency_not_converted");
      return {
        ...EMPTY_BUDGET,
        ambiguousCurrency: true,
        notes,
        matchedText: max.text,
      };
    }
    const approximate = /\b(?:buget|budget)\b/.test(max.text) && !/maxim|max|cel mult|pana la/.test(max.text);
    if (max.currency == null) notes.push("currency_assumed_ron");
    return {
      budgetMin: 0,
      budgetMax: max.value,
      budgetSpecified: true,
      budgetConstraint: approximate ? "approximate" : "hard",
      exclusiveMax: max.exclusive,
      ambiguousCurrency: notes.includes("foreign_currency_not_converted"),
      notes,
      matchedText: max.text,
    };
  }

  const approx = matchApproximate(text);
  if (approx) {
    if (!plausible(approx.value)) {
      notes.push("budget_implausible_ignored");
      return { ...EMPTY_BUDGET, notes };
    }
    if (approx.currency === "other") {
      notes.push("foreign_currency_not_converted");
      return {
        ...EMPTY_BUDGET,
        ambiguousCurrency: true,
        notes,
        matchedText: approx.text,
      };
    }
    return {
      budgetMin: 0,
      budgetMax: approx.value,
      budgetSpecified: true,
      budgetConstraint: "approximate",
      exclusiveMax: false,
      ambiguousCurrency: notes.includes("foreign_currency_not_converted"),
      notes,
      matchedText: approx.text,
    };
  }

  return { ...EMPTY_BUDGET, notes, ambiguousCurrency: notes.length > 0 };
}

/**
 * Apply the budget rule to one price. Unknown prices never pass a hard budget:
 * an unverifiable price is not evidence that the bottle is affordable.
 */
export function priceSatisfiesBudget(
  price: number | null | undefined,
  budget: BudgetExtraction,
): boolean {
  if (!budget.budgetSpecified || budget.budgetConstraint === "none") return true;
  if (price == null || !Number.isFinite(price)) {
    return budget.budgetConstraint !== "hard";
  }
  if (budget.budgetConstraint === "approximate") {
    const tolerance = Math.max(5, budget.budgetMax * 0.08);
    return price <= budget.budgetMax + tolerance;
  }
  if (budget.exclusiveMax) {
    if (price >= budget.budgetMax) return false;
  } else if (price > budget.budgetMax) {
    return false;
  }
  if (budget.budgetMin > 0 && price < budget.budgetMin) return false;
  return true;
}

export function describeBudget(
  budget: BudgetExtraction,
  locale: "ro" | "en" = "ro",
): string {
  if (!budget.budgetSpecified) {
    return locale === "en"
      ? "No budget was stated."
      : "Nu a fost specificat un buget.";
  }
  const max = budget.exclusiveMax
    ? `${locale === "en" ? "under" : "sub"} ${budget.budgetMax}`
    : `${locale === "en" ? "up to" : "pana la"} ${budget.budgetMax}`;
  if (budget.budgetMin > 0) {
    return `${budget.budgetMin}-${budget.budgetMax} RON`;
  }
  return `${max} RON${budget.budgetConstraint === "approximate" ? (locale === "en" ? " (approximate)" : " (aproximativ)") : ""}`;
}
