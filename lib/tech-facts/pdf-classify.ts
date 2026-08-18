/**
 * Classify a PDF before any technical facts are accepted.
 */
import { foldRomanianText } from "@/lib/pairing/romanian-text";
import type { PdfDocumentClass } from "@/lib/tech-facts/types";

const PRIVACY = /politica de confidentialitate|privacy policy|gdpr|prelucrarea datelor/i;
const TERMS = /termeni si conditii|terms and conditions|termenii de utilizare/i;
const MARKETING = /brosura|brochure|catalog general|prezentare crama/i;
const SHEET = /fisa (?:tehnica|de degustare)|tasting (?:sheet|note)|technical sheet|analiza fizico/i;

export function classifyPdfDocument(input: {
  text: string;
  title?: string | null;
  filename?: string | null;
  url?: string | null;
}): PdfDocumentClass {
  const title = `${input.title ?? ""} ${input.filename ?? ""} ${input.url ?? ""}`;
  const foldedTitle = foldRomanianText(title);
  const text = input.text.slice(0, 4000);

  if (PRIVACY.test(title) || PRIVACY.test(text) || foldedTitle.includes("confidentialitate")) {
    return "PRIVACY_POLICY";
  }
  if (TERMS.test(title) || TERMS.test(text)) {
    return "TERMS";
  }

  const wineHeadings = text.match(
    /(?:^|\n)\s*(?:vin|wine|denumire)[:\s].{3,60}/gi,
  );
  if ((wineHeadings?.length ?? 0) >= 3) {
    return "CATALOG_GENERIC";
  }
  if (MARKETING.test(title) && !SHEET.test(text)) {
    return "MARKETING_BROCHURE";
  }

  if (SHEET.test(title) || SHEET.test(text)) {
    return /fisa tehnica|technical sheet|analiza fizico/i.test(`${title} ${text}`)
      ? "WINE_TECHNICAL_SHEET"
      : "WINE_TASTING_SHEET";
  }

  if (/alcool|aciditate|zahar rezidual|vol\.?\s*alc/i.test(text)) {
    return "WINE_TECHNICAL_SHEET";
  }

  return "UNKNOWN_DOCUMENT";
}

export function isAcceptedPdfClass(value: PdfDocumentClass): boolean {
  return value === "WINE_TASTING_SHEET" || value === "WINE_TECHNICAL_SHEET";
}
