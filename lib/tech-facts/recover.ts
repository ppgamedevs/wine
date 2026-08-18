/**
 * Read-only technical recovery. Never writes wine rows or scores.
 */
import { classifySourceUrl, isOfficialProducerSource } from "@/lib/source-trust";
import { extractClaimsFromSource } from "@/lib/tech-facts/claims";
import { inferChannelToken, type ProductIdentity } from "@/lib/tech-facts/identity";
import { classifyPdfDocument, isAcceptedPdfClass } from "@/lib/tech-facts/pdf-classify";
import {
  classifyWineRecovery,
  reconcileField,
  safeAutomaticValue,
} from "@/lib/tech-facts/reconcile";
import type {
  FieldRecoveryResult,
  PdfDocumentClass,
  TechFactClaim,
  WineTechRecoveryClass,
} from "@/lib/tech-facts/types";

export interface RecoverableWine {
  id: number;
  slug: string;
  name: string;
  wineryName: string | null;
  winerySlug: string | null;
  vintage: number | null;
  type: string;
  sweetness: string | null;
  alcohol: number | null;
  acidity: number | null;
  sugar: number | null;
  grapeVarieties: { name: string }[];
  producerPageUrl: string | null;
  tastingSheetUrl: string | null;
  sourceUrl: string | null;
  tastingNotes: string | null;
  producerContent: {
    tastingNotes?: string;
    facts?: {
      alcohol?: number;
      acidity?: number;
      sugar?: number;
      sweetness?: string;
      vintage?: number;
    };
    sourceUrls?: string[];
  } | null;
}

export interface FetchStats {
  attempted: number;
  ok: number;
  failed: number;
  redirected: number;
  htmlInsteadOfPdf: number;
  cached: number;
}

export interface WineTechRecovery {
  wineId: number;
  slug: string;
  winerySlug: string | null;
  wineClass: WineTechRecoveryClass;
  fields: FieldRecoveryResult[];
  claims: TechFactClaim[];
  pdfClass: PdfDocumentClass | null;
  servingTemperature: string | null;
}

export interface RecoverOptions {
  fetchSource?: (url: string) => Promise<{
    text: string;
    contentType: string;
    redirected: boolean;
    ok: boolean;
  } | null>;
}

function wineIdentity(wine: RecoverableWine): ProductIdentity {
  return {
    wineName: wine.name,
    wineryName: wine.wineryName,
    vintage: wine.vintage,
    type: wine.type,
    grapes: wine.grapeVarieties.map((grape) => grape.name),
    channel: inferChannelToken(wine.name, wine.producerPageUrl),
  };
}

function storedSources(wine: RecoverableWine): Array<{
  text: string;
  url: string | null;
  isPdf?: boolean;
}> {
  const sources: Array<{ text: string; url: string | null; isPdf?: boolean }> = [];
  const officialUrl = wine.tastingSheetUrl ?? wine.producerPageUrl ?? null;
  const notes = [wine.producerContent?.tastingNotes, wine.tastingNotes]
    .filter(Boolean)
    .join("\n");
  if (notes) {
    sources.push({
      text: notes,
      url: officialUrl,
      isPdf: Boolean(wine.tastingSheetUrl),
    });
  }
  const facts = wine.producerContent?.facts;
  if (facts) {
    const lines = [
      facts.alcohol != null ? `Alcool ${facts.alcohol}% vol` : null,
      facts.acidity != null ? `Aciditate totala ${facts.acidity} g/L` : null,
      facts.sugar != null ? `Zahar rezidual ${facts.sugar} g/L` : null,
      facts.sweetness ? `Clasificare ${facts.sweetness}` : null,
      facts.vintage != null ? `An ${facts.vintage}` : null,
    ].filter((line): line is string => Boolean(line));
    if (lines.length > 0) {
      sources.push({
        text: lines.join("\n"),
        url: wine.producerContent?.sourceUrls?.[0] ?? officialUrl,
        isPdf: Boolean(wine.tastingSheetUrl),
      });
    }
  }
  return sources;
}

export function recoverWineFromStored(wine: RecoverableWine): WineTechRecovery {
  const identity = wineIdentity(wine);
  const claims: TechFactClaim[] = [];
  for (const source of storedSources(wine)) {
    claims.push(
      ...extractClaimsFromSource({
        text: source.text,
        url: source.url,
        sourceType: classifySourceUrl(source.url, { isPdf: source.isPdf }),
        wine: identity,
        sourceWineName: wine.name,
      }),
    );
  }

  const fields = (["alcohol", "acidity", "sugar", "sweetness", "vintage"] as const).map(
    (field) =>
      reconcileField({
        field,
        stored:
          field === "sweetness"
            ? wine.sweetness
            : field === "vintage"
              ? wine.vintage
              : wine[field],
        claims,
        wineHasVintage: wine.vintage != null,
        isNonVintageWine: wine.vintage == null,
      }),
  );

  const serving = claims.find((claim) => claim.field === "serving_temperature");

  return {
    wineId: wine.id,
    slug: wine.slug,
    winerySlug: wine.winerySlug,
    wineClass: classifyWineRecovery(fields),
    fields,
    claims,
    pdfClass: null,
    servingTemperature: serving ? String(serving.value) : null,
  };
}

export async function recoverWineWithSources(
  wine: RecoverableWine,
  fetched: Array<{ url: string; text: string; isPdf: boolean; title?: string }>,
): Promise<WineTechRecovery> {
  const identity = wineIdentity(wine);
  const base = recoverWineFromStored(wine);
  const claims = [...base.claims];
  let pdfClass: PdfDocumentClass | null = base.pdfClass;

  for (const source of fetched) {
    const type = classifySourceUrl(source.url, { isPdf: source.isPdf });
    if (source.isPdf) {
      pdfClass = classifyPdfDocument({
        text: source.text,
        title: source.title,
        url: source.url,
      });
      if (!isAcceptedPdfClass(pdfClass)) {
        continue;
      }
    }
    if (!isOfficialProducerSource(type) && type !== "producer_general") {
      continue;
    }
    const alcoholHits = source.text.match(/alcool[:\s]+\d/gi)?.length ?? 0;
    if (alcoholHits >= 3 || pdfClass === "CATALOG_GENERIC") {
      continue;
    }
    claims.push(
      ...extractClaimsFromSource({
        text: source.text,
        url: source.url,
        sourceType: type,
        wine: identity,
        documentTitle: source.title,
        filename: source.url,
      }),
    );
  }

  const fields = (["alcohol", "acidity", "sugar", "sweetness", "vintage"] as const).map(
    (field) =>
      reconcileField({
        field,
        stored:
          field === "sweetness"
            ? wine.sweetness
            : field === "vintage"
              ? wine.vintage
              : wine[field],
        claims,
        wineHasVintage: wine.vintage != null,
        isNonVintageWine: wine.vintage == null,
      }),
  );
  const serving = claims.find((claim) => claim.field === "serving_temperature");

  return {
    wineId: wine.id,
    slug: wine.slug,
    winerySlug: wine.winerySlug,
    wineClass: classifyWineRecovery(fields),
    fields,
    claims,
    pdfClass,
    servingTemperature: serving ? String(serving.value) : null,
  };
}

export function simulatedSafePatch(recovery: WineTechRecovery): {
  alcohol?: number;
  acidity?: number;
  sugar?: number;
  sweetness?: string;
} {
  const patch: {
    alcohol?: number;
    acidity?: number;
    sugar?: number;
    sweetness?: string;
  } = {};
  for (const field of recovery.fields) {
    const value = safeAutomaticValue(field);
    if (value == null || field.action !== "VALUE_WRITE") continue;
    if (field.field === "alcohol" && typeof value === "number") patch.alcohol = value;
    if (field.field === "acidity" && typeof value === "number") patch.acidity = value;
    if (field.field === "sugar" && typeof value === "number") patch.sugar = value;
    if (field.field === "sweetness" && typeof value === "string") patch.sweetness = value;
  }
  return patch;
}

export function officialUrlCandidates(wine: RecoverableWine): string[] {
  const urls = new Set<string>();
  for (const url of [
    wine.tastingSheetUrl,
    wine.producerPageUrl,
    ...(wine.producerContent?.sourceUrls ?? []),
  ]) {
    if (!url?.trim()) continue;
    const type = classifySourceUrl(url, { isPdf: url.toLowerCase().includes(".pdf") });
    if (isOfficialProducerSource(type) || type === "producer_general") {
      urls.add(url.trim());
    }
  }
  return [...urls];
}
