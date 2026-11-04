import { resolveWineDisplayPrice } from "@/lib/wine-price";
import { priceSatisfiesBudget, type BudgetExtraction } from "@/lib/sommelier-budget";
import type { RetailerRequest } from "@/lib/sommelier-retailer";
import type { WineWithRelations } from "@/types";

export type AvailabilityCase =
  | "catalog_empty"
  | "no_verified_price"
  | "retailer_unavailable"
  | "budget_excludes"
  | "retrieval_unavailable"
  | "ok";

export interface AvailabilityDiagnosis {
  primary: AvailabilityCase;
  cases: AvailabilityCase[];
  hasCatalogWines: boolean;
  hasVerifiedPrice: boolean;
  hasInBudgetVerifiedPrice: boolean;
  retailerRequested: boolean;
  budgetSpecified: boolean;
  exclusiveMax: boolean;
  pricedCount: number;
  inBudgetPricedCount: number;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Separates five conditions that must never be collapsed into "nothing good
 * exists": empty catalog, no verified price, missing retailer feed, budget
 * exclusion and retrieval failure.
 */
export function diagnoseAvailability(input: {
  allWines: WineWithRelations[];
  budget: BudgetExtraction;
  retailer: RetailerRequest;
  retrievalFailed?: boolean;
}): AvailabilityDiagnosis {
  const priced = input.allWines.filter(
    (wine) => resolveWineDisplayPrice(wine) != null,
  );
  const inBudget = priced.filter((wine) =>
    priceSatisfiesBudget(resolveWineDisplayPrice(wine), input.budget),
  );
  const cases: AvailabilityCase[] = [];

  if (input.allWines.length === 0) cases.push("catalog_empty");
  if (input.allWines.length > 0 && priced.length === 0) {
    cases.push("no_verified_price");
  }
  if (
    input.retailer.detected &&
    input.retailer.availabilityStatus !== "verified"
  ) {
    cases.push("retailer_unavailable");
  }
  if (
    input.budget.budgetSpecified &&
    priced.length > 0 &&
    inBudget.length === 0
  ) {
    cases.push("budget_excludes");
  }
  if (input.retrievalFailed) cases.push("retrieval_unavailable");

  const primary: AvailabilityCase = cases.includes("catalog_empty")
    ? "catalog_empty"
    : cases.includes("no_verified_price")
      ? "no_verified_price"
      : cases.includes("budget_excludes")
        ? "budget_excludes"
        : cases.includes("retailer_unavailable")
          ? "retailer_unavailable"
          : cases.includes("retrieval_unavailable")
            ? "retrieval_unavailable"
            : "ok";

  return {
    primary,
    cases: unique(cases.length > 0 ? cases : ["ok"]),
    hasCatalogWines: input.allWines.length > 0,
    hasVerifiedPrice: priced.length > 0,
    hasInBudgetVerifiedPrice: inBudget.length > 0,
    retailerRequested: input.retailer.detected,
    budgetSpecified: input.budget.budgetSpecified,
    exclusiveMax: input.budget.exclusiveMax,
    pricedCount: priced.length,
    inBudgetPricedCount: inBudget.length,
  };
}

export function describeAvailabilityForPrompt(
  diagnosis: AvailabilityDiagnosis,
  locale: "ro" | "en" = "ro",
): string[] {
  const ro = locale !== "en";
  const lines: string[] = [];
  if (diagnosis.cases.includes("catalog_empty")) {
    lines.push(
      ro
        ? "Catalogul VinIntel nu conține vinuri pentru această cerere. Spune asta scurt; nu inventa și nu generaliza despre piață."
        : "The VinIntel catalog has no wines for this request. Say so briefly; do not invent or make claims about the market.",
    );
  }
  if (diagnosis.cases.includes("no_verified_price")) {
    lines.push(
      ro
        ? "Catalogul are vinuri, dar niciunul nu are o ofertă Profitshare verificată și proaspătă. Nu spune că nu există vinuri bune sau că bugetul este imposibil. Spune că nu poți verifica prețul și oferă criterii de stil sau pași de verificare."
        : "The catalog has wines, but none has a fresh verified Profitshare offer. Do not claim that no good wines exist or that the budget is impossible. Say that the price cannot be verified and offer style criteria or verification steps.",
    );
  }
  if (diagnosis.cases.includes("retailer_unavailable")) {
    lines.push(
      ro
        ? "Nu există date licențiate de stoc/preț pentru retailerul cerut. Nu afirma disponibilitate în magazin și nu inventa prețuri de raft."
        : "No licensed stock or shelf-price data is available for the requested retailer. Do not claim store availability or invent shelf prices.",
    );
  }
  if (diagnosis.cases.includes("budget_excludes")) {
    lines.push(
      ro
        ? "Există prețuri verificate, dar niciun vin nu respectă bugetul cerut. Nu depăși bugetul, nu propune o sticlă mai scumpă și nu presupune că utilizatorul vrea să plătească mai mult."
        : "Verified prices exist, but no wine meets the stated budget. Do not exceed it, do not suggest a more expensive bottle, and do not assume the user wants to spend more.",
    );
  }
  if (diagnosis.cases.includes("retrieval_unavailable")) {
    lines.push(
      ro
        ? "Retrieval-ul sau o sursă externă este indisponibilă acum. Nu inventa și nu substitui; cere o reîncercare."
        : "Retrieval or an external source is unavailable right now. Do not invent or substitute; ask the user to try again.",
    );
  }
  if (
    diagnosis.budgetSpecified &&
    diagnosis.exclusiveMax &&
    !diagnosis.cases.includes("budget_excludes")
  ) {
    lines.push(
      ro
        ? "Bugetul este strict sub capătul menționat: un vin la exact acel preț nu se califică."
        : "The budget is strictly below the stated cap: a wine at exactly that price does not qualify.",
    );
  }
  return lines;
}
