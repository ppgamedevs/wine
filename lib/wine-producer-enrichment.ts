import { stripHtml } from "@/lib/fetch-page-text-utils";
import { extractPdfTextFromUrl } from "@/lib/pdf-text";
import type { GrapeVarietyShare } from "@/lib/schema";
import type { WineSweetnessLevel } from "@/lib/wine-tech-specs";
import { slugify } from "@/lib/wine-url";
import { extractVintageFromPageText } from "@/lib/wine-vintage";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 VinIntelBot/1.0";

const FETCH_INIT: RequestInit = {
  headers: {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent": USER_AGENT,
  },
  signal: AbortSignal.timeout(18_000),
};

const MAX_PRODUCER_TEXT_CHARS = 12_000;
const MAX_PDF_TEXT_CHARS = 6_000;

/** Date canonice de pe site-ul producatorului (prioritare fata de retailer). */
export interface ProducerCanonicalFacts {
  name: string | null;
  grapeVarieties: GrapeVarietyShare[];
  vintage: number | null;
  alcohol: number | null;
  acidity: number | null;
  sweetness: WineSweetnessLevel | null;
  imageUrl: string | null;
}

export interface ProducerEnrichment {
  producerPageUrl: string | null;
  tastingSheetUrl: string | null;
  producerText: string;
  pdfText: string;
  combinedText: string;
  canonical: ProducerCanonicalFacts | null;
}

const WINERY_SITE_ALIASES: Record<string, string[]> = {
  "cramele-recas": [
    "https://cramelerecas.ro",
    "https://www.cramelerecas.ro",
    "https://cramelerecas.ro",
  ],
};

function normalizeMatchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wineNameTokens(wineName: string): string[] {
  const stopWords = new Set([
    "vin",
    "rose",
    "roze",
    "rosu",
    "alb",
    "sec",
    "demisec",
    "demidulce",
    "dulce",
    "l",
    "ml",
    "ll",
  ]);

  return normalizeMatchText(wineName)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

/** Slug-uri cunoscute pe cramelerecas.ro/vinuri/{slug}/ */
function resolveRecasKnownSlugs(wineName: string): string[] {
  const norm = normalizeMatchText(wineName);
  const slugs: string[] = [];

  if (norm.includes("muse") && norm.includes("stars")) {
    slugs.push("muse-stars-rose-spumant", "muse-stars");
  }
  if (norm.includes("muse") && norm.includes("day")) {
    slugs.push("muse-day");
  }
  if (norm.includes("muse") && norm.includes("night")) {
    slugs.push("muse-night");
  }
  if (norm.includes("sole") && (norm.includes("rose") || norm.includes("roze"))) {
    slugs.push("sole-roze");
  }
  if (norm.includes("sole") && norm.includes("chardonnay")) {
    slugs.push("sole-chardonnay");
  }
  if (norm.includes("solo") && norm.includes("quinta")) {
    if (norm.includes("alb")) slugs.push("solo-quinta-alb");
    else if (norm.includes("rose") || norm.includes("roze")) {
      slugs.push("solo-quinta-roze");
    } else {
      slugs.push("solo-quinta");
    }
  }

  return slugs;
}

function wineSlugCandidates(wineName: string, winerySlug?: string): string[] {
  const cleaned = wineName
    .replace(/\b\d{4}\b/g, " ")
    .replace(/\b0[,.]?\d+\s*l+\b/gi, " ")
    .replace(/\b(vin|alb|rosu|rose|roze|recas)\b/gi, " ")
    .replace(/\b(sec|demisec|demidulce|dulce|cupaj)\b/gi, " ")
    .trim();

  const slug = slugify(cleaned);
  const tokens = wineNameTokens(wineName);
  const compact = slugify(tokens.join("-"));
  const seriesSlug = slugify(
    tokens.filter((token) => !["cramele", "recas"].includes(token)).slice(0, 2).join("-"),
  );

  const known =
    winerySlug === "cramele-recas" ? resolveRecasKnownSlugs(wineName) : [];

  return [...new Set([...known, slug, compact, seriesSlug].filter(Boolean))];
}

function websiteCandidates(
  website: string | null | undefined,
  winerySlug: string,
): string[] {
  const urls = new Set<string>();

  if (website?.trim()) {
    try {
      const parsed = new URL(website.trim());
      const host = parsed.host.replace(/^www\./, "");
      urls.add(`${parsed.protocol}//${parsed.host}`);
      urls.add(`${parsed.protocol}//${host}`);
      urls.add(`${parsed.protocol}//www.${host}`);
    } catch {
      // ignore invalid website
    }
  }

  for (const alias of WINERY_SITE_ALIASES[winerySlug] ?? []) {
    urls.add(alias);
  }

  return [...urls];
}

function buildProductPageCandidates(
  baseUrl: string,
  wineName: string,
  winerySlug?: string,
): string[] {
  const slugs = wineSlugCandidates(wineName, winerySlug);
  const paths = ["/vinuri/{slug}/", "/vinuri/{slug}"];

  const candidates: string[] = [];
  for (const slug of slugs) {
    for (const path of paths) {
      try {
        candidates.push(new URL(path.replace("{slug}", slug), baseUrl).toString());
      } catch {
        // ignore invalid URL
      }
    }
  }

  return [...new Set(candidates)];
}

function extractOgImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]?.trim()) continue;
    try {
      const resolved = new URL(match[1].trim().replace(/&amp;/g, "&"), pageUrl);
      if (["http:", "https:"].includes(resolved.protocol)) {
        return resolved.toString();
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function parseDecimalToken(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function parseSweetnessLabel(raw: string): WineSweetnessLevel | null {
  const norm = normalizeMatchText(raw);
  if (norm === "sec") return "sec";
  if (norm === "demisec") return "demisec";
  if (norm === "demidulce") return "demidulce";
  if (norm === "dulce") return "dulce";
  return null;
}

function parseGrapeVarietiesFromCupaj(text: string): GrapeVarietyShare[] {
  const cupajBlock = text.match(
    /cupaj\s*([\s\S]*?)(?=culoare|an\b|apela|vol\.?\s*alc|temperatur)/i,
  )?.[1];
  if (!cupajBlock) return [];

  const varieties: GrapeVarietyShare[] = [];
  for (const match of cupajBlock.matchAll(
    /([A-Za-zÀ-ž][A-Za-zÀ-ž\s.'-]{2,45}?)\s*(\d{1,3})\s*%/g,
  )) {
    const name = match[1]?.trim();
    const percentage = match[2] ? Number.parseInt(match[2], 10) : null;
    if (!name || percentage == null || !Number.isFinite(percentage)) continue;
    varieties.push({ name, percentage });
  }

  return varieties;
}

/** Extrage fapte structurate de pe paginile de produs Cramele Recas. */
export function parseRecasProducerFacts(
  html: string,
  pageUrl: string,
): ProducerCanonicalFacts | null {
  if (!pageUrl.includes("cramelerecas.ro")) return null;

  const plain = stripHtml(html);
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = titleMatch?.[1]?.trim() ?? null;

  const vintage =
    extractVintageFromPageText(plain) ??
    (() => {
      const m = plain.match(/\bAn\s*(20\d{2}|19\d{2})\b/i);
      return m?.[1] ? Number.parseInt(m[1], 10) : null;
    })();

  const alcoholMatch = plain.match(
    /Vol\.?\s*Alc\.?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
  );
  const acidityMatch = plain.match(
    /Aciditate\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*g\s*\/\s*l/i,
  );
  const sweetnessMatch = plain.match(
    /Clasificare\s*(Sec|Demisec|Demidulce|Dulce)/i,
  );

  const grapeVarieties = parseGrapeVarietiesFromCupaj(plain);
  const imageUrl = extractOgImage(html, pageUrl);

  if (
    !name &&
    grapeVarieties.length === 0 &&
    vintage == null &&
    !alcoholMatch &&
    !imageUrl
  ) {
    return null;
  }

  return {
    name,
    grapeVarieties,
    vintage,
    alcohol: alcoholMatch?.[1] ? parseDecimalToken(alcoholMatch[1]) : null,
    acidity: acidityMatch?.[1] ? parseDecimalToken(acidityMatch[1]) : null,
    sweetness: sweetnessMatch?.[1]
      ? parseSweetnessLabel(sweetnessMatch[1])
      : null,
    imageUrl,
  };
}

function extractPdfLinks(html: string, pageUrl: string): string[] {
  const links = new Set<string>();

  for (const match of html.matchAll(/href=["']([^"']+\.pdf[^"']*)["']/gi)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      links.add(new URL(raw, pageUrl).toString());
    } catch {
      // ignore invalid URL
    }
  }

  return [...links];
}

function scoreProducerPage(
  html: string,
  wineName: string,
  pageUrl: string,
): number {
  const text = normalizeMatchText(stripHtml(html));
  const tokens = wineNameTokens(wineName);
  let score = 0;

  for (const token of tokens) {
    if (text.includes(token)) score += 3;
  }

  if (/\.pdf/i.test(html)) score += 6;
  if (/aciditate|vol\.?\s*alc|clasificare|cupaj|arome/i.test(text)) score += 8;
  if (/fisa.*degustare|degustare/i.test(text)) score += 4;
  if (pageUrl.includes("/vinuri/")) score += 5;

  const knownSlugs = resolveRecasKnownSlugs(wineName);
  for (const slug of knownSlugs) {
    if (pageUrl.includes(`/vinuri/${slug}`)) score += 12;
  }

  return score;
}

async function fetchProducerHtml(
  url: string,
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const response = await fetch(url, { ...FETCH_INIT, redirect: "follow" });
    if (!response.ok) return null;

    const html = await response.text();
    if (html.length < 500) return null;

    return { html, finalUrl: response.url };
  } catch {
    return null;
  }
}

function pickBestPdfLink(links: string[], wineName: string): string | null {
  if (links.length === 0) return null;

  const tokens = wineNameTokens(wineName);
  let best = links[0];
  let bestScore = -1;

  for (const link of links) {
    const haystack = normalizeMatchText(link);
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 2;
    }
    if (/fisa|degust/i.test(haystack)) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = link;
    }
  }

  return best;
}

function emptyEnrichment(): ProducerEnrichment {
  return {
    producerPageUrl: null,
    tastingSheetUrl: null,
    producerText: "",
    pdfText: "",
    combinedText: "",
    canonical: null,
  };
}

export async function enrichWineFromProducerSite(input: {
  wineryWebsite: string | null | undefined;
  winerySlug: string;
  wineName: string;
}): Promise<ProducerEnrichment> {
  const bases = websiteCandidates(input.wineryWebsite, input.winerySlug);
  if (bases.length === 0) return emptyEnrichment();

  let bestPage: { html: string; finalUrl: string; score: number } | null = null;

  for (const base of bases) {
    const candidates = buildProductPageCandidates(
      base,
      input.wineName,
      input.winerySlug,
    );
    for (const candidate of candidates) {
      const page = await fetchProducerHtml(candidate);
      if (!page) continue;

      const score = scoreProducerPage(page.html, input.wineName, page.finalUrl);
      if (score < 6) continue;

      if (!bestPage || score > bestPage.score) {
        bestPage = { ...page, score };
      }
    }
  }

  if (!bestPage) return emptyEnrichment();

  const producerText = stripHtml(bestPage.html).slice(0, MAX_PRODUCER_TEXT_CHARS);
  const pdfLinks = extractPdfLinks(bestPage.html, bestPage.finalUrl);
  const tastingSheetUrl = pickBestPdfLink(pdfLinks, input.wineName);
  const pdfText = tastingSheetUrl
    ? (await extractPdfTextFromUrl(tastingSheetUrl)).slice(0, MAX_PDF_TEXT_CHARS)
    : "";

  const combinedText = [producerText, pdfText ? `Fisa degustare PDF: ${pdfText}` : ""]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_PRODUCER_TEXT_CHARS + MAX_PDF_TEXT_CHARS);

  const canonical =
    input.winerySlug === "cramele-recas"
      ? parseRecasProducerFacts(bestPage.html, bestPage.finalUrl)
      : null;

  return {
    producerPageUrl: bestPage.finalUrl,
    tastingSheetUrl,
    producerText,
    pdfText,
    combinedText,
    canonical,
  };
}

export function producerImageSourceFromUrl(pageUrl: string): string {
  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("cramelerecas") || host.includes("cramele-recas")) {
      return "cramelerecas";
    }
    const [label] = host.split(".");
    return label || host;
  } catch {
    return "producer";
  }
}
