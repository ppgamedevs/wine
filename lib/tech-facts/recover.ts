/**
 * Read-only technical recovery. Never writes wine rows, evidence, or scores.
 */
import {
  resolveBallaGezaWineFromCatalogResult,
  type BallaMatchStatus,
} from "@/lib/ballageza-producer";
import { parseBudureascaProductPage } from "@/lib/budureasca-producer";
import { parseGabaiProductPage } from "@/lib/gabai-producer";
import { parseMurfatlarProductPage } from "@/lib/murfatlar-producer";
import { classifySourceUrl, isOfficialProducerSource } from "@/lib/source-trust";
import { extractClaimsFromSource } from "@/lib/tech-facts/claims";
import { claimIdentityHash } from "@/lib/tech-facts/hash";
import { inferChannelToken, type DatabaseWineIdentity } from "@/lib/tech-facts/identity";
import {
  classifyPdfDocument,
  isAcceptedPdfClass,
  isRejectedTechnicalDocumentUrl,
} from "@/lib/tech-facts/pdf-classify";
import {
  classifyWineRecovery,
  reconcileField,
  safeAutomaticValue,
} from "@/lib/tech-facts/reconcile";
import { qualifyField } from "@/lib/tech-facts/qualify";
import {
  classifySourceName,
  extractFocusedProductHtml,
  extractSourceIdentityFromHtml,
  extractSourceIdentityFromText,
} from "@/lib/tech-facts/source-identity";
import type {
  FieldRecoveryResult,
  IdentityMatchClass,
  PdfDocumentClass,
  SourceNameClass,
  SourceVintageClass,
  TechFactClaim,
  WineTechRecoveryClass,
} from "@/lib/tech-facts/types";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import { parseAvincisProducerFacts } from "@/lib/wine-producer-enrichment";

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
  valueScore?: number | null;
  giftScore?: number | null;
  foodMatchScore?: number | null;
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
  sourceIdentity?: {
    sourceWineName: string | null;
    sourceVintage: number | null;
    match: string;
  };
  ballaStatus?: BallaMatchStatus;
  ballaMatch?: {
    productId: number;
    productName: string | null;
    vintage: number | null;
    category: string | null;
    alcohol: number | null;
    acidity: number | null;
    sugar: number | null;
    sweetness: string | null;
  };
}

function wineIdentity(wine: RecoverableWine): DatabaseWineIdentity {
  return {
    wineName: wine.name,
    wineryName: wine.wineryName,
    vintage: wine.vintage,
    type: wine.type,
    grapes: wine.grapeVarieties.map((grape) => grape.name),
    channel: inferChannelToken(wine.name, wine.producerPageUrl ?? wine.slug),
  };
}

function legacyFactClaims(wine: RecoverableWine): TechFactClaim[] {
  const facts = wine.producerContent?.facts;
  if (!facts) return [];
  const url = wine.producerContent?.sourceUrls?.[0] ?? wine.tastingSheetUrl ?? wine.producerPageUrl ?? null;
  const sourceType = classifySourceUrl(url);
  const rows: Array<{ field: "alcohol" | "acidity" | "sugar" | "sweetness" | "vintage"; value: string | number; excerpt: string }> = [];
  if (facts.alcohol != null) {
    rows.push({ field: "alcohol", value: facts.alcohol, excerpt: "legacy producerContent.facts.alcohol" });
  }
  if (facts.acidity != null) {
    rows.push({ field: "acidity", value: facts.acidity, excerpt: "legacy producerContent.facts.acidity" });
  }
  if (facts.sugar != null) {
    rows.push({ field: "sugar", value: facts.sugar, excerpt: "legacy producerContent.facts.sugar" });
  }
  if (facts.sweetness) {
    rows.push({ field: "sweetness", value: facts.sweetness, excerpt: "legacy producerContent.facts.sweetness" });
  }
  if (facts.vintage != null) {
    rows.push({ field: "vintage", value: facts.vintage, excerpt: "legacy producerContent.facts.vintage" });
  }
  return rows.map((row) => {
    const identityHash = claimIdentityHash([
      row.field,
      String(row.value),
      url,
      "legacy_producer_fact",
      row.excerpt,
    ]);
    return {
      field: row.field,
      value: row.value,
      unit: row.field === "alcohol" ? "% vol" : row.field === "acidity" || row.field === "sugar" ? "g/L" : null,
      sourceUrl: url,
      sourceType,
      sourceWineName: null,
      sourceVintage: null,
      sourceDocumentTitle: null,
      excerpt: row.excerpt,
      extractionMethod: "legacy_producer_fact" as const,
      identityMatchClass: "SOURCE_IDENTITY_INCOMPLETE" as const,
      sourceNameClass: "SOURCE_NAME_MISSING" as const,
      sourceVintageClass: "SOURCE_VINTAGE_MISSING" as const,
      confidence: 0.2,
      observedAt: new Date().toISOString(),
      sourceHash: identityHash,
      claimIdentityHash: identityHash,
    };
  });
}

function stampBallaNameClass(dbName: string, sourceName: string): SourceNameClass {
  const compared = classifySourceName(dbName, sourceName);
  if (compared === "SOURCE_NAME_CONFLICT") return "SOURCE_NAME_CONFLICT";
  if (compared === "SOURCE_NAME_MISSING") return "SOURCE_NAME_MISSING";
  return "SOURCE_NAME_EXACT";
}

function stampBallaIdentity(
  dbVintage: number | null,
  sourceVintage: number | null,
  nameClass: SourceNameClass,
): IdentityMatchClass {
  if (nameClass === "SOURCE_NAME_MISSING") return "SOURCE_IDENTITY_INCOMPLETE";
  if (nameClass === "SOURCE_NAME_CONFLICT") return "PRODUCT_MISMATCH";
  if (dbVintage != null && sourceVintage != null && dbVintage !== sourceVintage) {
    return "EXACT_WINE_DIFFERENT_VINTAGE";
  }
  if (dbVintage != null && sourceVintage == null) return "EXACT_WINE_UNDATED_SOURCE";
  return "EXACT_WINE_EXACT_VINTAGE";
}

export function recoverWineFromStored(wine: RecoverableWine): WineTechRecovery {
  const identity = wineIdentity(wine);
  const claims: TechFactClaim[] = [...legacyFactClaims(wine)];
  const notes = [wine.producerContent?.tastingNotes].filter(Boolean).join("\n");
  if (notes) {
    claims.push(
      ...extractClaimsFromSource({
        text: notes,
        url: wine.producerPageUrl ?? wine.tastingSheetUrl,
        sourceType: classifySourceUrl(wine.producerPageUrl ?? wine.tastingSheetUrl),
        wine: identity,
      }),
    );
  }

  return finalizeRecovery(wine, claims, null);
}

export async function recoverWineWithSources(
  wine: RecoverableWine,
  fetched: Array<{ url: string; text: string; isPdf: boolean; title?: string; html?: string }>,
): Promise<WineTechRecovery> {
  const identity = wineIdentity(wine);
  const base = recoverWineFromStored(wine);
  const claims = [...base.claims];
  let pdfClass: PdfDocumentClass | null = base.pdfClass;
  let ballaStatus: BallaMatchStatus | undefined;
  let ballaMatch: WineTechRecovery["ballaMatch"];
  let sourceIdentity = base.sourceIdentity;

  for (const source of fetched) {
    if (isRejectedTechnicalDocumentUrl(source.url)) {
      pdfClass = "PRIVACY_POLICY";
      continue;
    }
    const type = classifySourceUrl(source.url, { isPdf: source.isPdf });
    if (source.isPdf) {
      pdfClass = classifyPdfDocument({
        text: source.text,
        title: source.title,
        url: source.url,
      });
      if (!isAcceptedPdfClass(pdfClass)) continue;
    }
    if (!isOfficialProducerSource(type) && type !== "producer_general") continue;

    if (source.html && wine.winerySlug === "balla-geza") {
      const resolved = resolveBallaGezaWineFromCatalogResult(
        source.html,
        source.url,
        `${wine.name} ${wine.vintage ?? ""} ${wine.slug}`,
      );
      if (
        resolved.status === "EXACT_MATCH" ||
        ballaStatus == null ||
        (ballaStatus === "NO_MATCH" && resolved.status === "AMBIGUOUS_MATCH")
      ) {
        ballaStatus = resolved.status;
      }
      if (resolved.status === "EXACT_MATCH" && resolved.wine) {
        const block = resolved.wine.blockText;
        const extractedClaims = extractClaimsFromSource({
          text: block,
          url: source.url,
          sourceType: "producer_page",
          wine: identity,
          sourceWineName: resolved.wine.name,
          documentTitle: `${resolved.wine.name} ${resolved.wine.vintage ?? ""}`.trim(),
        });
        const nameClass = stampBallaNameClass(wine.name, resolved.wine.name);
        const identityClass = stampBallaIdentity(wine.vintage, resolved.wine.vintage, nameClass);
        const vintageClass: SourceVintageClass =
          resolved.wine.vintage != null ? "SOURCE_VINTAGE_EXPLICIT" : "SOURCE_VINTAGE_MISSING";
        claims.push(
          ...extractedClaims.map((item) => ({
            ...item,
            sourceWineName: resolved.wine!.name,
            sourceVintage: resolved.wine!.vintage,
            sourceNameClass: nameClass,
            sourceVintageClass: vintageClass,
            identityMatchClass: identityClass,
          })),
        );
        sourceIdentity = {
          sourceWineName: resolved.wine.name,
          sourceVintage: resolved.wine.vintage,
          match: identityClass,
        };
        ballaMatch = {
          productId: resolved.wine.productId,
          productName: resolved.wine.name,
          vintage: resolved.wine.vintage,
          category: resolved.wine.category,
          alcohol: resolved.wine.alcohol,
          acidity: resolved.wine.acidity,
          sugar: resolved.wine.sugar,
          sweetness: resolved.wine.sweetness,
        };
        continue;
      }
      continue;
    }

    if (source.html && wine.winerySlug === "crama-gabai") {
      const parsed = parseGabaiProductPage(source.html, source.url);
      if (parsed?.name) {
        const specText = extractFocusedProductHtml(source.html);
        const focusedText = stripHtml(specText).slice(0, 8000);
        claims.push(
          ...extractClaimsFromSource({
            text: focusedText,
            url: source.url,
            sourceType: type,
            wine: identity,
            sourceWineName: parsed.name,
            documentTitle: parsed.name,
            html: specText,
          }),
        );
        sourceIdentity = {
          sourceWineName: parsed.name,
          sourceVintage: parsed.vintage,
          match: classifySourceName(wine.name, parsed.name),
        };
        continue;
      }
    }

    if (source.html && wine.winerySlug === "budureasca") {
      const parsed = parseBudureascaProductPage(source.html, source.url);
      if (parsed?.name) {
        const specText = extractFocusedProductHtml(source.html);
        const focusedText = stripHtml(specText).slice(0, 8000);
        claims.push(
          ...extractClaimsFromSource({
            text: focusedText,
            url: source.url,
            sourceType: type,
            wine: identity,
            sourceWineName: parsed.name,
            documentTitle: parsed.name,
            html: specText,
          }),
        );
        sourceIdentity = {
          sourceWineName: parsed.name,
          sourceVintage: parsed.vintage,
          match: parsed.vintage != null ? "EXACT_VINTAGE" : "UNDATED_EXACT_PRODUCT",
        };
        continue;
      }
    }

    if (source.html && wine.winerySlug === "murfatlar") {
      const parsed = parseMurfatlarProductPage(source.html, source.url, wine.name);
      if (!parsed?.name) {
        continue;
      }
      const specText = extractFocusedProductHtml(source.html);
      const focusedText = stripHtml(specText).slice(0, 8000);
      claims.push(
        ...extractClaimsFromSource({
          text: focusedText,
          url: source.url,
          sourceType: type,
          wine: identity,
          sourceWineName: parsed.name,
          documentTitle: parsed.name,
          html: specText,
        }),
      );
      sourceIdentity = {
        sourceWineName: parsed.name,
        sourceVintage: null,
        match: classifySourceName(wine.name, parsed.name),
      };
      continue;
    }

    if (source.html && wine.winerySlug === "avincis") {
      const parsed = parseAvincisProducerFacts(source.html, source.url);
      if (parsed?.name) {
        const focusedHtml = extractFocusedProductHtml(source.html);
        const focusedText = stripHtml(focusedHtml).slice(0, 8000);
        claims.push(
          ...extractClaimsFromSource({
            text: focusedText,
            url: source.url,
            sourceType: type,
            wine: identity,
            sourceWineName: parsed.name,
            documentTitle: parsed.name,
            html: focusedHtml,
          }),
        );
        sourceIdentity = {
          sourceWineName: parsed.name,
          sourceVintage: parsed.vintage,
          match: classifySourceName(wine.name, parsed.name),
        };
        continue;
      }
    }

    const focusedHtml = source.html ? extractFocusedProductHtml(source.html) : null;
    const focusedText = focusedHtml
      ? stripHtml(focusedHtml).slice(0, 8000)
      : source.text;
    const alcoholHits = focusedText.match(/alcool[:\s]+\d/gi)?.length ?? 0;
    if (!source.isPdf && alcoholHits >= 3) {
      continue;
    }

    const extracted = focusedHtml
      ? extractSourceIdentityFromHtml(focusedHtml)
      : extractSourceIdentityFromText({
          text: focusedText,
          title: source.title,
          filename: source.url,
        });
    claims.push(
      ...extractClaimsFromSource({
        text: focusedText,
        url: source.url,
        sourceType: type,
        wine: identity,
        sourceWineName: extracted.sourceWineName,
        documentTitle: extracted.sourceWineName ?? source.title,
        filename: source.url,
        html: focusedHtml,
      }),
    );
    if (extracted.sourceWineName) {
      sourceIdentity = {
        sourceWineName: extracted.sourceWineName,
        sourceVintage: extracted.sourceVintage,
        match: extracted.nameClass,
      };
    }
  }

  const recovery = finalizeRecovery(wine, claims, pdfClass);
  return { ...recovery, sourceIdentity, ballaStatus, ballaMatch };
}

function finalizeRecovery(
  wine: RecoverableWine,
  claims: TechFactClaim[],
  pdfClass: PdfDocumentClass | null,
): WineTechRecovery {
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
  ).map(qualifyField);
  if (
    pdfClass &&
    (pdfClass === "PRIVACY_POLICY" ||
      pdfClass === "TERMS" ||
      pdfClass === "CATALOG_GENERIC" ||
      pdfClass === "UNKNOWN_DOCUMENT")
  ) {
    const live = claims.filter((claim) => claim.extractionMethod !== "legacy_producer_fact");
    if (live.length === 0) {
      for (const field of fields) {
        if (field.qualification === "QUALIFIED_EXACT" || field.qualification === "QUALIFIED_CORROBORATED") {
          continue;
        }
        field.qualification = "INVALID_DOCUMENT";
        field.qualificationReasons = [`pdfClass=${pdfClass}`];
        field.safeAutomatic = false;
        if (field.action === "EVIDENCE_ATTACH") field.action = "NONE";
      }
    }
  }
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
    if (!url?.trim() || isRejectedTechnicalDocumentUrl(url)) continue;
    const type = classifySourceUrl(url, { isPdf: url.toLowerCase().includes(".pdf") });
    if (isOfficialProducerSource(type) || type === "producer_general") {
      urls.add(url.trim());
    }
  }
  return [...urls];
}
