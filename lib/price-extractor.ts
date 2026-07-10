import { generateObject } from "ai";
import { z } from "zod";
import { getSommelierModel } from "@/lib/ai/model";
import {
  fetchPageWithResolution,
  type FetchPageResult,
} from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import { normalizeSourceUrl } from "@/lib/wine-url";
import { extractVintageFromHtml } from "@/lib/wine-vintage";

const LOG_PREFIX = "[price-extractor]";
const MIN_WINE_PRICE_RON = 12;
const MAX_WINE_PRICE_RON = 2500;
const LLM_HTML_MAX_CHARS = 8_000;

export interface ExtractedProductData {
  sourceUrl: string;
  finalUrl: string;
  name: string | null;
  price: number | null;
  imageUrl: string | null;
  producer: string | null;
  vintage: number | null;
}

export interface ExtractProductOptions {
  allowLlm?: boolean;
  /** Skip fetch; use provided HTML and final URL. */
  html?: string;
  finalUrl?: string;
}

const llmProductSchema = z.object({
  name: z.string().nullable(),
  price: z.number().positive().nullable(),
  imageUrl: z.string().nullable(),
  producer: z.string().nullable(),
});

const emptyProduct = (
  sourceUrl: string,
  finalUrl = sourceUrl,
): ExtractedProductData => ({
  sourceUrl,
  finalUrl,
  name: null,
  price: null,
  imageUrl: null,
  producer: null,
  vintage: null,
});

function log(message: string): void {
  console.log(`${LOG_PREFIX} ${message}`);
}

function logWarn(message: string): void {
  console.warn(`${LOG_PREFIX} ${message}`);
}

function parsePriceToken(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;

  const rounded = Math.round(value);
  if (rounded < MIN_WINE_PRICE_RON || rounded > MAX_WINE_PRICE_RON) {
    return null;
  }
  return rounded;
}

function pickBestPrice(candidates: number[]): number | null {
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

function extractEmagDisplayedPriceTokens(html: string): string[] {
  const tokens: string[] = [];
  const blocks = html.match(
    /<[^>]+class=["'][^"']*product-new-price[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi,
  );

  for (const block of blocks ?? []) {
    const text = decodeHtmlEntities(block.replace(/<[^>]+>/g, " "));
    const match = text.match(/(\d{1,4})\s*(?:[,.]\s*|\s+)(\d{2})\s*Lei/i);
    if (match?.[1] && match[2]) {
      tokens.push(`${match[1]}.${match[2]}`);
      continue;
    }

    const integerMatch = text.match(/(\d{1,4})\s*Lei/i);
    if (integerMatch?.[1]) {
      tokens.push(integerMatch[1]);
    }
  }

  return tokens;
}

function extractWithPatterns(html: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const token = match[1];
      if (token?.trim()) matches.push(token.trim());
    }
  }
  return matches;
}

function normalizeEmagProductImageUrl(resolved: URL): string {
  const host = resolved.hostname.toLowerCase();
  if (!host.includes("akamaized.net")) {
    return resolved.toString();
  }

  if (!/\/products\/\d+\/\d+\/images\//.test(resolved.pathname)) {
    return resolved.toString();
  }

  const width = resolved.searchParams.get("width");
  const height = resolved.searchParams.get("height");
  if (width && height && width === height) {
    // Square Akamai crops on tall bottle shots often add visible side bands.
    resolved.searchParams.delete("width");
    resolved.searchParams.delete("height");
  }

  return resolved.toString();
}

function normalizeImageUrl(raw: string, pageUrl: string): string | null {
  const trimmed = raw.trim().replace(/&amp;/g, "&");
  if (!trimmed || trimmed.startsWith("data:")) return null;

  try {
    const resolved = new URL(trimmed, pageUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) return null;
    return normalizeEmagProductImageUrl(resolved);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const patterns = [
      new RegExp(
        `<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`,
        "i",
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]?.trim()) {
        return decodeHtmlEntities(match[1]);
      }
    }
  }

  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function cleanRetailerProductTitle(title: string): string {
  const trimmed = title
    .replace(/\s*[-|]\s*eMAG\.ro.*$/i, "")
    .replace(/\s*[-|]\s*Altex\.ro.*$/i, "")
    .replace(/\s*[-|]\s*Flanco\.ro.*$/i, "")
    .replace(/\s*[-|]\s*cumpără.*$/i, "")
    .trim();

  if (/schwaben\s+wein/i.test(trimmed)) {
    const parts = ["Schwaben Wein"];
    if (/roze|rose/i.test(trimmed)) parts.push("Roze");
    if (/demisec/i.test(trimmed)) parts.push("Demisec");
    else if (/demidulce/i.test(trimmed)) parts.push("Demidulce");
    else if (/\bsec\b/i.test(trimmed)) parts.push("Sec");
    return parts.join(" ");
  }

  const castelHuniade = trimmed.match(
    /^(?:Vin\s+)?Castel\s+Huniade\s+(.+?)(?:\s+0\.?75\s*l)?$/i,
  );
  if (castelHuniade?.[1]) {
    const rest = castelHuniade[1]
      .replace(/\s+0\.?75\s*l$/i, "")
      .replace(/\s+(Demisec|Demidulce|Dulce|Sec)$/i, "")
      .trim();
    return `Castel Huniade ${rest}`;
  }

  const avincis = trimmed.match(
    /^Avincis\s+(.+?)(?:,\s*Sec|,?\s*0\.?75\s*l)?$/i,
  );
  if (avincis?.[1]) {
    return avincis[1]
      .replace(/\s+0\.?75\s*l$/i, "")
      .replace(/\s*,?\s*(Sec|Demisec|Demidulce|Dulce)$/i, "")
      .trim();
  }

  return trimmed.replace(/^Vin\s+(Recas\s+)?/i, "").trim();
}

function extractProducerFromTitle(title: string | null): string | null {
  if (!title) return null;

  const cramMatch = title.match(
    /\b(Crama(?:ua)?\s+[A-Za-zÀ-ž0-9][A-Za-zÀ-ž0-9\s.'-]{1,40})/i,
  );
  if (cramMatch?.[1]) return cramMatch[1].trim();

  const vinuriMatch = title.match(
    /\b(Vinuri(?:le)?\s+[A-Za-zÀ-ž0-9][A-Za-zÀ-ž0-9\s.'-]{1,40})/i,
  );
  if (vinuriMatch?.[1]) return vinuriMatch[1].trim();

  const leadingBrand = title.match(/^([A-ZÀ-Ž][A-Za-zÀ-ž.'-]{2,30})\s[-|,]/);
  if (leadingBrand?.[1] && !/^(Vin|Crama|Wine)/i.test(leadingBrand[1])) {
    return leadingBrand[1].trim();
  }

  return null;
}

function extractOgImage(html: string, pageUrl: string): string | null {
  const candidates = extractWithPatterns(html, [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi,
  ]);

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, pageUrl);
    if (normalized) return normalized;
  }

  return null;
}

function detectRetailer(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Retailer slug for imageSource, e.g. "emag", "avincis". */
export function inferImageSourceFromUrl(url: string): string {
  const host = detectRetailer(url);
  if (!host) return "unknown";
  if (host.includes("emag")) return "emag";
  const [label] = host.split(".");
  return label || host;
}

function extractEmagProduct(
  html: string,
  pageUrl: string,
): ExtractedProductData {
  log("eMag detectat, incerc regex dedicat (nume, pret, imagine, producator)");

  const titleRaw =
    extractMetaContent(html, ["og:title", "twitter:title", "product:title"]) ??
    extractTitleTag(html);
  const name = titleRaw ? cleanRetailerProductTitle(titleRaw) : null;

  const brandTokens = extractWithPatterns(html, [
    /<meta[^>]+property=["']product:brand["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:brand["']/gi,
    /"brand"\s*:\s*"([^"]+)"/gi,
    /"manufacturer"\s*:\s*"([^"]+)"/gi,
  ]);
  const producer =
    brandTokens.map((token) => decodeHtmlEntities(token)).find(Boolean) ??
    extractProducerFromTitle(titleRaw);

  const priceTokens = [
    ...extractEmagDisplayedPriceTokens(html),
    ...extractWithPatterns(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/gi,
    /"salePrice"\s*:\s*(\d+(?:\.\d{1,2})?)/gi,
    /"price"\s*:\s*(\d+(?:\.\d{1,2})?)/gi,
    ]),
  ];

  const prices = priceTokens
    .map((token) => parsePriceToken(token))
    .filter((value): value is number => value != null);

  const price = pickBestPrice(prices);
  const imageUrl = extractOgImage(html, pageUrl);

  if (name) log(`eMag regex nume: ${name}`);
  if (price != null) log(`eMag regex pret: ${price} RON`);
  if (imageUrl) log(`eMag regex imagine: ${imageUrl}`);
  if (producer) log(`eMag regex producator: ${producer}`);

  return {
    sourceUrl: pageUrl,
    finalUrl: pageUrl,
    name,
    price,
    imageUrl,
    producer,
    vintage: null,
  };
}

function extractGenericProductMeta(
  html: string,
  pageUrl: string,
): ExtractedProductData {
  const titleRaw =
    extractMetaContent(html, ["og:title", "twitter:title", "product:title"]) ??
    extractTitleTag(html);
  const name = titleRaw ? cleanRetailerProductTitle(titleRaw) : null;

  const brandTokens = extractWithPatterns(html, [
    /<meta[^>]+property=["']product:brand["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:brand["']/gi,
    /"brand"\s*:\s*"([^"]+)"/gi,
  ]);

  const producer =
    brandTokens.map((token) => decodeHtmlEntities(token)).find(Boolean) ??
    extractProducerFromTitle(titleRaw);

  const priceTokens = extractWithPatterns(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/gi,
    /"price"\s*:\s*(\d+(?:\.\d{1,2})?)/gi,
  ]);

  const prices = priceTokens
    .map((token) => parsePriceToken(token))
    .filter((value): value is number => value != null);

  return {
    sourceUrl: pageUrl,
    finalUrl: pageUrl,
    name,
    price: pickBestPrice(prices),
    imageUrl: extractOgImage(html, pageUrl),
    producer,
    vintage: null,
  };
}

function mergeProductData(
  primary: ExtractedProductData,
  secondary: ExtractedProductData,
): ExtractedProductData {
  return {
    sourceUrl: primary.sourceUrl || secondary.sourceUrl,
    finalUrl: primary.finalUrl || secondary.finalUrl,
    name: primary.name ?? secondary.name,
    price: primary.price ?? secondary.price,
    imageUrl: primary.imageUrl ?? secondary.imageUrl,
    producer: primary.producer ?? secondary.producer,
    vintage: primary.vintage ?? secondary.vintage,
  };
}

function attachSourceContext(
  data: ExtractedProductData,
  sourceUrl: string,
  finalUrl: string,
): ExtractedProductData {
  return {
    ...data,
    sourceUrl,
    finalUrl,
  };
}

async function extractProductWithLlm(
  html: string,
  finalUrl: string,
): Promise<ExtractedProductData> {
  if (!process.env.XAI_API_KEY?.trim()) {
    logWarn("LLM skip: XAI_API_KEY lipseste");
    return emptyProduct(finalUrl);
  }

  log("LLM extractie produs (nume, pret, imagine, producator)");
  const pageText = stripHtml(html).slice(0, LLM_HTML_MAX_CHARS);

  try {
    const { object } = await generateObject({
      model: getSommelierModel(),
      schema: llmProductSchema,
      system:
        "Extrage din HTML-ul paginii de produs: numele vinului, pretul curent in RON, URL-ul absolut al pozei principale si producatorul/crama (din titlu, meta product:brand sau og:title). Daca un camp nu e clar, returneaza null.",
      prompt: `URL: ${finalUrl}\n\nHTML:\n${pageText}`,
      temperature: 0,
    });

    const price =
      object.price != null ? parsePriceToken(String(object.price)) : null;
    const imageUrl = object.imageUrl
      ? normalizeImageUrl(object.imageUrl, finalUrl)
      : null;
    const name = object.name?.trim() || null;
    const producer = object.producer?.trim() || null;

    if (name) log(`LLM nume: ${name}`);
    if (price != null) log(`LLM pret: ${price} RON`);
    if (imageUrl) log(`LLM imagine: ${imageUrl}`);
    if (producer) log(`LLM producator: ${producer}`);

    return {
      sourceUrl: finalUrl,
      finalUrl,
      name,
      price,
      imageUrl,
      producer,
      vintage: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn(`LLM esuat: ${message}`);
    return emptyProduct(finalUrl);
  }
}

function needsLlmFallback(
  data: ExtractedProductData,
  requireAll: boolean,
): boolean {
  if (requireAll) {
    return (
      data.name == null ||
      data.price == null ||
      data.imageUrl == null ||
      data.producer == null
    );
  }

  return (
    data.name == null &&
    data.price == null &&
    data.imageUrl == null &&
    data.producer == null
  );
}

export async function extractProductFromHtml(
  html: string,
  finalUrl: string,
  options: ExtractProductOptions & { sourceUrl?: string } = {},
): Promise<ExtractedProductData> {
  const sourceUrl = options.sourceUrl ?? finalUrl;
  const host = detectRetailer(finalUrl);
  log(`retailer host=${host || "necunoscut"} final=${finalUrl}`);

  let result = attachSourceContext(emptyProduct(sourceUrl, finalUrl), sourceUrl, finalUrl);

  if (host.includes("emag.ro")) {
    result = attachSourceContext(extractEmagProduct(html, finalUrl), sourceUrl, finalUrl);
  } else {
    result = attachSourceContext(
      extractGenericProductMeta(html, finalUrl),
      sourceUrl,
      finalUrl,
    );
  }

  const shouldUseLlm =
    options.allowLlm !== false &&
    (host.includes("emag.ro") ? needsLlmFallback(result, false) : true);

  if (shouldUseLlm) {
    const llmResult = await extractProductWithLlm(html, finalUrl);
    result = attachSourceContext(
      host.includes("emag.ro")
        ? mergeProductData(result, llmResult)
        : mergeProductData(llmResult, result),
      sourceUrl,
      finalUrl,
    );
  } else if (!host.includes("emag.ro")) {
    log("LLM dezactivat si site non-eMag: fara extractie LLM");
  }

  const vintage = extractVintageFromHtml(html);
  if (vintage != null) {
    result = { ...result, vintage };
  }

  return result;
}

export async function extractProductFromUrl(
  rawUrl: string,
  options: ExtractProductOptions = {},
): Promise<ExtractedProductData> {
  const sourceUrl = normalizeSourceUrl(rawUrl);
  log(`start url=${sourceUrl}`);

  let page: FetchPageResult;
  try {
    if (options.html && options.finalUrl) {
      page = {
        html: options.html,
        finalUrl: options.finalUrl,
        sourceUrl,
        redirectChain: [sourceUrl, options.finalUrl],
      };
      log(`reuse HTML final=${page.finalUrl}`);
    } else {
      log("fetch pagina...");
      page = await fetchPageWithResolution(sourceUrl);
      log(
        `fetch ok (${page.html.length} chars) final=${page.finalUrl}` +
          (page.redirectChain.length > 1
            ? ` redirects=${page.redirectChain.length}`
            : ""),
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn(`fetch esuat: ${message}`);
    return emptyProduct(sourceUrl);
  }

  const result = await extractProductFromHtml(page.html, page.finalUrl, {
    ...options,
    sourceUrl,
  });

  log(
    `final name=${result.name ?? "null"} price=${result.price ?? "null"} ` +
      `image=${result.imageUrl ? "ok" : "null"} producer=${result.producer ?? "null"}`,
  );

  return result;
}

/** @deprecated Prefer extractProductFromUrl */
export async function extractPriceFromUrl(
  url: string,
  options: ExtractProductOptions = {},
): Promise<ExtractedProductData> {
  return extractProductFromUrl(url, options);
}

/** @deprecated Prefer extractProductFromHtml */
export async function extractPriceFromHtml(
  html: string,
  url: string,
  options: ExtractProductOptions & { sourceUrl?: string } = {},
): Promise<ExtractedProductData> {
  return extractProductFromHtml(html, url, options);
}
