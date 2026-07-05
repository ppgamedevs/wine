import { stripHtml } from "@/lib/fetch-page-text-utils";
import { extractPdfTextFromUrl } from "@/lib/pdf-text";
import { slugify } from "@/lib/wine-url";

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

export interface ProducerEnrichment {
  producerPageUrl: string | null;
  tastingSheetUrl: string | null;
  producerText: string;
  pdfText: string;
  combinedText: string;
}

const WINERY_SITE_ALIASES: Record<string, string[]> = {
  "cramele-recas": [
    "https://cramelerecas.ro",
    "https://www.cramele-recas.ro",
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
  ]);

  return normalizeMatchText(wineName)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function wineSlugCandidates(wineName: string): string[] {
  const cleaned = wineName
    .replace(/\b\d{4}\b/g, " ")
    .replace(/\b0[,.]?\d+\s*l\b/gi, " ")
    .replace(/\b(sec|demisec|demidulce|dulce)\b/gi, " ")
    .trim();

  const slug = slugify(cleaned);
  const tokens = wineNameTokens(wineName);
  const compact = slugify(tokens.join("-"));

  return [...new Set([slug, compact].filter(Boolean))];
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

function buildProductPageCandidates(baseUrl: string, wineName: string): string[] {
  const slugs = wineSlugCandidates(wineName);
  const paths = [
    "/vinuri/{slug}/",
    "/vinuri/{slug}",
    "/shop/{slug}/",
    "/shop/{slug}",
    "/{slug}/",
    "/{slug}",
  ];

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

function scoreProducerPage(html: string, wineName: string): number {
  const text = normalizeMatchText(stripHtml(html));
  const tokens = wineNameTokens(wineName);
  let score = 0;

  for (const token of tokens) {
    if (text.includes(token)) score += 3;
  }

  if (/\.pdf/i.test(html)) score += 6;
  if (/aciditate|vol\.?\s*alc|clasificare|cupaj|arome/i.test(text)) score += 5;
  if (/fisa.*degustare|degustare/i.test(text)) score += 4;

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
    const candidates = buildProductPageCandidates(base, input.wineName);
    for (const candidate of candidates) {
      const page = await fetchProducerHtml(candidate);
      if (!page) continue;

      const score = scoreProducerPage(page.html, input.wineName);
      if (score < 4) continue;

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

  return {
    producerPageUrl: bestPage.finalUrl,
    tastingSheetUrl,
    producerText,
    pdfText,
    combinedText,
  };
}
