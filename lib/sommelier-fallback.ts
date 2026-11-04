import type { AvailabilityDiagnosis } from "@/lib/sommelier-availability";
import type { BudgetExtraction } from "@/lib/sommelier-budget";
import type { RetailerRequest } from "@/lib/sommelier-retailer";

/**
 * Deterministic safe answer when there is no eligible candidate. This avoids a
 * model turning missing data into a claim about the whole market, a budget
 * upsell or a joke at the customer's expense.
 */
export function buildAvailabilityFallback(input: {
  diagnosis: AvailabilityDiagnosis;
  budget: BudgetExtraction;
  retailer: RetailerRequest;
  locale: "ro" | "en";
}): string {
  const { diagnosis, budget, retailer, locale } = input;
  const en = locale === "en";
  const budgetLabel = budget.budgetSpecified
    ? `${budget.budgetMax} ${en ? "RON" : "lei"}`
    : en
      ? "the requested budget"
      : "bugetul cerut";
  const budgetPhrase =
    budget.budgetSpecified && budget.exclusiveMax
      ? en
        ? `under ${budgetLabel}`
        : `sub ${budgetLabel}`
      : en
        ? `within ${budgetLabel}`
        : `în bugetul de ${budgetLabel}`;
  const parts: string[] = [];

  if (diagnosis.cases.includes("catalog_empty")) {
    parts.push(
      en
        ? "I do not have a matching wine in the VinIntel catalog right now."
        : "Nu am acum un vin potrivit în catalogul VinIntel.",
    );
  }
  if (diagnosis.cases.includes("no_verified_price")) {
    parts.push(
      en
        ? `The catalog has wines, but none has a fresh verified Profitshare price under ${budgetLabel}. I cannot verify a shelf price or availability from that.`
        : `Catalogul are vinuri, dar niciunul nu are o ofertă Profitshare verificată și proaspătă sub ${budgetLabel}. Nu pot verifica un preț de raft sau disponibilitatea din asta.`,
    );
  }
  if (diagnosis.cases.includes("retailer_unavailable") && retailer.label) {
    parts.push(
      en
        ? `For ${retailer.label}, I do not have licensed live stock or shelf-price data, so I cannot confirm that a bottle is in that store.`
        : `Pentru ${retailer.label}, nu am date licențiate de stoc sau preț live, așa că nu pot confirma că o sticlă este în acel magazin.`,
    );
  }
  if (diagnosis.cases.includes("budget_excludes")) {
    parts.push(
      en
        ? `I do have verified prices, but none fits strictly under ${budgetLabel}. I will not raise your budget or suggest a more expensive bottle.`
        : `Am prețuri verificate, dar niciunul nu se încadrează strict sub ${budgetLabel}. Nu îți urc bugetul și nu îți propun o sticlă mai scumpă.`,
    );
  }
  if (diagnosis.cases.includes("retrieval_unavailable")) {
    parts.push(
      en
        ? "Catalog retrieval is unavailable right now, so I will not invent a bottle or a price. Please try again shortly."
        : "Căutarea în catalog este indisponibilă acum, așa că nu inventez o sticlă sau un preț. Încearcă din nou în curând.",
    );
  }

  parts.push(
    en
      ? `A useful next step: look for a dry, fresh wine with lively acidity ${budgetPhrase}, check the label for the exact product and bottle size, and verify the shelf price in store. I can also help you compare style criteria without pretending to know live stock.`
      : `Un pas util: caută un vin sec, proaspăt, cu aciditate vie ${budgetPhrase}, verifică eticheta pentru produsul și volumul exact, apoi confirmă prețul pe raft în magazin. Te pot ajuta și cu criterii de stil, fără să pretind că știu stocul live.`,
  );

  return parts.join(en ? " " : " ");
}
