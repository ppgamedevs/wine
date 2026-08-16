/**
 * Producer-specific culinary recovery.
 * Uses dedicated parsers. Does not scrape unrelated retailer or blog copy.
 */
import { resolveBallaGezaWineFromCatalog } from "@/lib/ballageza-producer";
import { extractBudureascaOverviewText } from "@/lib/budureasca-producer";
import {
  extractCulinarySectionFromHtml,
  extractCulinarySectionFromPlainText,
  type CulinarySectionExtract,
} from "@/lib/culinary-extract";
import { extractGabaiDescriptionText } from "@/lib/gabai-producer";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import { classifySourceUrl, isOfficialProducerSource } from "@/lib/source-trust";

function htmlToPlain(html: string): string {
  return stripHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export interface OfficialCulinaryExtract extends CulinarySectionExtract {
  mixedProductCards: boolean;
  catalogLevel: boolean;
  method:
    | "html_heading"
    | "plain_text"
    | "budureasca_overview"
    | "ballageza_exact"
    | "gabai_description"
    | "avincis_page"
    | "murfatlar_page"
    | "none";
}

function emptyOfficial(): OfficialCulinaryExtract {
  return {
    found: false,
    text: "",
    heading: null,
    chromeRejected: false,
    tastingNoteRejected: false,
    laundryListRejected: false,
    genericLanguageRejected: false,
    sourceExcerpt: "",
    mixedProductCards: false,
    catalogLevel: false,
    method: "none",
  };
}

function withMethod(
  section: CulinarySectionExtract,
  method: OfficialCulinaryExtract["method"],
  extras: Partial<OfficialCulinaryExtract> = {},
): OfficialCulinaryExtract {
  return {
    ...section,
    mixedProductCards: extras.mixedProductCards ?? false,
    catalogLevel: extras.catalogLevel ?? false,
    method: section.found ? method : extras.method ?? "none",
  };
}

function looksLikeMixedProductCards(html: string, pageUrl: string): boolean {
  const sourceType = classifySourceUrl(pageUrl);
  if (sourceType === "producer_page" || sourceType === "tasting_sheet") {
    return false;
  }
  const cards = html.match(/class="[^"]*(product|wine__|woocommerce-loop-product)[^"]*"/gi) ?? [];
  return cards.length >= 6;
}

export function extractOfficialCulinaryFromHtml(
  html: string,
  pageUrl: string,
  options: { winerySlug?: string | null; wineName?: string | null } = {},
): OfficialCulinaryExtract {
  if (!isOfficialProducerSource(classifySourceUrl(pageUrl))) {
    return emptyOfficial();
  }

  const sourceType = classifySourceUrl(pageUrl);
  const catalogLevel = sourceType === "producer_catalog" || sourceType === "producer_general";
  const mixedProductCards = looksLikeMixedProductCards(html, pageUrl);
  const heading = extractCulinarySectionFromHtml(html);
  if (heading.found) {
    return withMethod(heading, "html_heading", { catalogLevel, mixedProductCards });
  }

  const slug = options.winerySlug ?? "";
  const host = pageUrl.toLowerCase();

  if (slug === "budureasca" || host.includes("budureasca.ro")) {
    const overview = extractBudureascaOverviewText(html);
    if (overview) {
      return withMethod(
        extractCulinarySectionFromPlainText(overview),
        "budureasca_overview",
        { catalogLevel, mixedProductCards },
      );
    }
  }

  if (slug === "balla-geza" || host.includes("ballageza.com")) {
    const exact = resolveBallaGezaWineFromCatalog(html, pageUrl, options.wineName);
    if (!exact) {
      return {
        ...emptyOfficial(),
        mixedProductCards: true,
        catalogLevel: true,
        method: "none",
      };
    }
    if (exact.tastingNotes) {
      return withMethod(
        extractCulinarySectionFromPlainText(exact.tastingNotes),
        "ballageza_exact",
        { catalogLevel: false, mixedProductCards: false },
      );
    }
    return emptyOfficial();
  }

  if (slug === "crama-gabai" || host.includes("cramagabai.ro")) {
    const description = extractGabaiDescriptionText(html);
    if (description) {
      return withMethod(
        extractCulinarySectionFromPlainText(description),
        "gabai_description",
        { catalogLevel, mixedProductCards },
      );
    }
  }

  if (slug === "avincis" || host.includes("avincis.ro")) {
    if (mixedProductCards || catalogLevel) {
      return {
        ...emptyOfficial(),
        mixedProductCards,
        catalogLevel,
        method: "none",
      };
    }
    const plain = htmlToPlain(html);
    return withMethod(extractCulinarySectionFromPlainText(plain), "avincis_page", {
      catalogLevel: false,
      mixedProductCards: false,
    });
  }

  if (slug === "murfatlar" || host.includes("murfatlar-vinul.ro")) {
    const plain = htmlToPlain(html);
    return withMethod(extractCulinarySectionFromPlainText(plain), "murfatlar_page", {
      catalogLevel,
      mixedProductCards,
    });
  }

  const fallback = extractCulinarySectionFromPlainText(htmlToPlain(html));
  return withMethod(fallback, "plain_text", { catalogLevel, mixedProductCards });
}
