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
  color: "alb" | "roze" | "rosu" | null;
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

  if (norm.includes("implicit") && (norm.includes("rose") || norm.includes("roze"))) {
    slugs.push("implicit-roze");
  }
  if (norm.includes("implicit") && norm.includes("aligote")) {
    slugs.push("implicit-aligote");
  }
  if (norm.includes("implicit") && norm.includes("chardonnay")) {
    slugs.push("implicit-chardonnay");
  }
  if (norm.includes("implicit") && (norm.includes("pinot grigio") || norm.includes("pinot-grigio"))) {
    slugs.push("implicit-pinot-grigio");
  }
  if (
    norm.includes("implicit") &&
    (norm.includes("sauvignon blanc") || norm.includes("sauvignon-blanc"))
  ) {
    slugs.push("implicit-sauvignon-blanc");
  }
  if (norm.includes("explicit") && (norm.includes("rose") || norm.includes("roze"))) {
    slugs.push("roze-explicit", "explicit-roze");
  }
  if (norm.includes("explicit") && norm.includes("cabernet")) {
    slugs.push("explicit-cabernet-sauvignon");
  }
  if (norm.includes("explicit") && norm.includes("merlot")) {
    slugs.push("explicit-merlot");
  }
  if (
    norm.includes("explicit") &&
    (norm.includes("sauvignon blanc") || norm.includes("sauvignon-blanc"))
  ) {
    slugs.push("explicit-sauvignon-blanc");
  }
  if (norm.includes("explicit") && norm.includes("chardonnay")) {
    slugs.push("explicit-chardonnay");
  }
  if (
    norm.includes("explicit") &&
    norm.includes("feteasca") &&
    norm.includes("regala")
  ) {
    slugs.push("explicit-feteasca-regala");
  }
  if (
    norm.includes("explicit") &&
    (norm.includes("muscat ottonel") || norm.includes("muscat-ottonel"))
  ) {
    slugs.push("explicit-muscat-ottonel");
  }
  if (norm.includes("muse") && norm.includes("stars")) {
    if (norm.includes("rose") || norm.includes("roze")) {
      slugs.push("muse-stars-rose-spumant", "muse-stars");
    } else if (
      norm.includes("brut") ||
      norm.includes("chardonnay") ||
      norm.includes("spumant alb")
    ) {
      // Alb brut: pagina dedicata lipseste pe site; evitam rose-ul.
    } else {
      slugs.push("muse-stars-rose-spumant", "muse-stars");
    }
  }
  if (norm.includes("muse") && norm.includes("day")) {
    slugs.push("muse-day");
  }
  if (norm.includes("muse") && norm.includes("night")) {
    slugs.push("muse-night");
  }
  if (norm.includes("muse") && norm.includes("white")) {
    if (norm.includes("magnum")) {
      slugs.push("muse-white-magnum");
    } else {
      slugs.push("muse-white");
    }
  }
  if (norm.includes("sole") && (norm.includes("rose") || norm.includes("roze"))) {
    slugs.push("sole-roze");
  }
  if (norm.includes("sole") && norm.includes("chardonnay")) {
    slugs.push("sole-chardonnay");
  }
  if (norm.includes("sole") && norm.includes("orange")) {
    slugs.push("sole-orange-wine");
  }
  if (norm.includes("sole") && norm.includes("feteasca") && norm.includes("regala")) {
    slugs.push("sole-feteasca-regala");
  }
  if (norm.includes("solo") && norm.includes("quinta")) {
    if (norm.includes("alb")) slugs.push("solo-quinta-alb");
    else if (norm.includes("rose") || norm.includes("roze")) {
      slugs.push("solo-quinta-roze");
    } else {
      slugs.push("solo-quinta");
    }
  }
  if (norm.includes("castel") && norm.includes("huniade")) {
    if (norm.includes("cabernet")) {
      slugs.push("castel-huniade-cabernet-sauvignon");
    } else if (norm.includes("merlot")) {
      slugs.push("castel-huniade-merlot");
    } else if (norm.includes("riesling")) {
      slugs.push("castel-huniade-riesling");
    } else if (norm.includes("feteasca") && norm.includes("regala")) {
      slugs.push("castel-huniade-feteasca-regala");
    } else if (norm.includes("feteasca") && norm.includes("neagra")) {
      slugs.push("castel-huniade-feteasca-neagra");
    } else if (norm.includes("sauvignon") && norm.includes("blanc")) {
      slugs.push("castel-huniade-sauvignon-blanc");
    } else if (norm.includes("muscat")) {
      slugs.push("castel-huniade-muscat-ottonel");
    } else if (norm.includes("sarba")) {
      slugs.push("castel-huniade-sarba");
    } else if (
      norm.includes("rose") ||
      norm.includes("roze") ||
      (norm.includes("demisec") &&
        !norm.includes("cabernet") &&
        !norm.includes("merlot") &&
        !norm.includes("feteasca") &&
        !norm.includes("sauvignon") &&
        !norm.includes("muscat"))
    ) {
      slugs.push("castel-huniade-roze");
    }
  }
  if (norm.includes("schwaben") && norm.includes("wein")) {
    if (norm.includes("roze") || norm.includes("rose")) {
      if (norm.includes("demisec")) slugs.push("schwaben-wein-roze-demisec");
      else slugs.push("schwaben-wein-roze");
    } else if (norm.includes("cabernet") && norm.includes("pinot")) {
      slugs.push("schwaben-wein-cabernet-sauvignon-pinot-noir");
    } else if (norm.includes("cabernet")) {
      slugs.push("schwaben-wein-cabernet-sauvignon");
    } else if (norm.includes("merlot")) {
      slugs.push("schwaben-wein-merlot");
    } else if (norm.includes("riesling")) {
      slugs.push("schwaben-wein-riesling-italian");
    } else if (norm.includes("feteasca") && norm.includes("regala")) {
      slugs.push("schwaben-wein-feteasca-regala");
    } else if (norm.includes("muscat")) {
      slugs.push("schwaben-wein-muscat-ottonel");
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

function extractRecasSlugFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, "");
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    return last && last !== "vinuri" ? last : null;
  } catch {
    return null;
  }
}

function buildRecasUrlCandidates(
  baseUrl: string,
  slug: string,
): string[] {
  return [
    new URL(`/${slug}/`, baseUrl).toString(),
    new URL(`/vinuri/${slug}/`, baseUrl).toString(),
  ];
}
function buildProductPageCandidates(
  baseUrl: string,
  wineName: string,
  winerySlug?: string,
): string[] {
  const slugs = wineSlugCandidates(wineName, winerySlug);
  const paths =
    winerySlug === "cramele-recas"
      ? ["/{slug}/", "/vinuri/{slug}/", "/vinuri/{slug}"]
      : ["/vinuri/{slug}/", "/vinuri/{slug}"];

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

function parsePercentVarietiesFromCommaList(segment: string): GrapeVarietyShare[] {
  const varieties: GrapeVarietyShare[] = [];

  for (const part of segment.split(/[,;]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.+?)\s*(\d{1,3})\s*%$/);
    const name = match?.[1]?.trim().replace(/\bCupaj\b/gi, " ").trim();
    const percentage = match?.[2] ? Number.parseInt(match[2], 10) : null;
    if (!name || percentage == null || !Number.isFinite(percentage)) continue;
    if (name.length > 50 || /\./.test(name)) continue;
    varieties.push({ name, percentage });
  }

  return varieties;
}

function extractCompactCupajLine(block: string): string | null {
  const trimmed = block.replace(/^\s*Cupaj\s*/i, "").trim();
  if (trimmed.length <= 140) return trimmed;

  const inline = block.match(
    /Cupaj\s*((?:[A-Za-zÀ-ž][A-Za-zÀ-ž\s.'-]{2,40}\s*\d{1,3}\s*%,?\s*){1,6})/i,
  )?.[1];
  return inline?.trim() ?? null;
}

function parseGrapeVarietiesFromCupaj(text: string): GrapeVarietyShare[] {
  const cupajSections = [
    ...text.matchAll(
      /\bCupaj\s*([\s\S]{0,240}?)(?=Culoare|An\b|An\d|Apela|Vol\.?\s*Alc|Temperatur)/gi,
    ),
  ];

  for (const section of cupajSections) {
    const block = section[1] ?? "";
    const compact = extractCompactCupajLine(block);
    if (!compact) continue;

    const varieties = parsePercentVarietiesFromCommaList(compact);
    if (varieties.length === 0) continue;

    const total = varieties.reduce((sum, item) => sum + (item.percentage ?? 0), 0);
    if (total >= 90 && total <= 110) return varieties;
    if (varieties.length === 1 && varieties[0]?.percentage === 100) {
      return varieties;
    }
  }

  const singleSoi = text.match(
    /Soi\s*([A-Za-zÀ-ž][A-Za-zÀ-ž\s.'-]{2,45}?)(?=Culoare|An\b|An\d|Apela|Vol|Clasificare)/i,
  )?.[1];

  if (singleSoi?.trim()) {
    return [{ name: singleSoi.trim(), percentage: 100 }];
  }

  return [];
}

/** Extrage fapte structurate de pe paginile de produs Cramele Recas. */
function normalizeRecasPlainText(plain: string): string {
  return plain
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/\u2013|\u2014/g, "-");
}

export function parseRecasProducerFacts(
  html: string,
  pageUrl: string,
): ProducerCanonicalFacts | null {
  if (!pageUrl.includes("cramelerecas.ro")) return null;

  const plain = normalizeRecasPlainText(stripHtml(html));
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = titleMatch?.[1]?.trim() ?? null;

  const vintage =
    extractVintageFromPageText(plain) ??
    (() => {
      const m = plain.match(/\bAn\s*(20\d{2}|19\d{2})(?!\d)/i);
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
  const colorMatch = plain.match(/Culoare\s*(Alb|Roze|Roșu|Rosu)/i);

  const grapeVarietiesFromCupaj = parseGrapeVarietiesFromCupaj(plain);
  const imageUrl = extractOgImage(html, pageUrl);

  let resolvedGrapes = grapeVarietiesFromCupaj;
  const multiSoi = plain.match(
    /Soi\s*([A-Za-zÀ-ž][\s\S]*?)(?=Culoare|An\b|An\d|Apela|Vol|Clasificare)/i,
  )?.[1];
  if (multiSoi && /[-–—]/.test(multiSoi)) {
    const names = multiSoi
      .split(/[-–—]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2);
    if (names.length >= 2) {
      const share = Math.round(100 / names.length);
      resolvedGrapes = names.map((name) => ({ name, percentage: share }));
    }
  }

  const colorRaw = colorMatch?.[1]?.toLowerCase().replace("ș", "s") ?? null;
  const color =
    colorRaw === "alb"
      ? "alb"
      : colorRaw === "roze"
        ? "roze"
        : colorRaw === "rosu"
          ? "rosu"
          : null;

  if (
    !name &&
    resolvedGrapes.length === 0 &&
    vintage == null &&
    !alcoholMatch &&
    !imageUrl
  ) {
    return null;
  }

  return {
    name,
    grapeVarieties: resolvedGrapes,
    vintage,
    alcohol: alcoholMatch?.[1] ? parseDecimalToken(alcoholMatch[1]) : null,
    acidity: acidityMatch?.[1] ? parseDecimalToken(acidityMatch[1]) : null,
    sweetness: sweetnessMatch?.[1]
      ? parseSweetnessLabel(sweetnessMatch[1])
      : null,
    imageUrl,
    color,
  };
}

/** Deduce pagina producatorului Recas din numele vinului sau URL-ul retailerului. */
export function inferRecasProducerPageUrl(
  wineName: string,
  contextUrl?: string | null,
): string | null {
  const retailContext = contextUrl ?? "";

  if (/explicit-roze|roze-explicit/i.test(retailContext)) {
    return "https://cramelerecas.ro/roze-explicit/";
  }

  if (
    /explicit.*sauvignon|sauvignon.*explicit|rec-261/i.test(retailContext)
  ) {
    return "https://cramelerecas.ro/explicit-sauvignon-blanc/";
  }

  if (
    /explicit.*chardonnay|chardonnay.*explicit|rec-282/i.test(retailContext)
  ) {
    return "https://cramelerecas.ro/explicit-chardonnay/";
  }

  if (
    /explicit.*feteasca.*regala|feteasca.*regala.*explicit|rec-259/i.test(
      retailContext,
    )
  ) {
    return "https://cramelerecas.ro/explicit-feteasca-regala/";
  }

  if (
    /explicit.*muscat.*ottonel|muscat.*ottonel.*explicit|rec-258/i.test(
      retailContext,
    )
  ) {
    return "https://cramelerecas.ro/explicit-muscat-ottonel/";
  }

  if (
    /sole.*orange|vin-orange.*sole|orange-recas-sole|sole-orange-wine/i.test(
      retailContext,
    )
  ) {
    return "https://cramelerecas.ro/sole-orange-wine/";
  }

  if (
    /muse-stars.*(?:rose|roze)|muse-stars-rose|rose-spumant.*muse-stars/i.test(
      retailContext,
    )
  ) {
    return "https://cramelerecas.ro/muse-stars-rose-spumant/";
  }

  if (
    /muse-stars.*brut|muse-stars-brut|spumant-alb-recas-muse-stars/i.test(
      retailContext,
    ) &&
    !/(?:rose|roze)/i.test(retailContext)
  ) {
    return null;
  }

  if (
    /castel-huniade.*(?:rose|roze|demisec)/i.test(retailContext) &&
    !/cabernet|merlot|riesling|feteasca|sauvignon|muscat|sarba/i.test(
      retailContext,
    )
  ) {
    return "https://cramelerecas.ro/castel-huniade-roze/";
  }

  if (
    /schwaben-wein.*roze.*demisec|roze.*demisec.*schwaben-wein/i.test(
      retailContext,
    )
  ) {
    return "https://cramelerecas.ro/schwaben-wein-roze-demisec/";
  }

  if (
    /schwaben-wein-roze(?:\/|$)/i.test(retailContext) &&
    !/demisec|demidulce/i.test(retailContext)
  ) {
    return "https://cramelerecas.ro/schwaben-wein-roze/";
  }

  if (/schwaben-wein.*(?:roze|rose)|(?:roze|rose).*schwaben-wein/i.test(retailContext)) {
    return "https://cramelerecas.ro/schwaben-wein-roze/";
  }

  const context = `${wineName} ${retailContext}`;

  if (/explicit-roze|roze-explicit/i.test(context)) {
    return "https://cramelerecas.ro/roze-explicit/";
  }

  const slugs = resolveRecasKnownSlugs(context);
  if (slugs.length === 0) return null;

  return `https://cramelerecas.ro/${slugs[0]}/`;
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
    if (pageUrl.includes(`/${slug}`)) score += 12;
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
  /** Cand sursa importului este pagina producatorului, o folosim ca adevar. */
  preferredPageUrl?: string | null;
}): Promise<ProducerEnrichment> {
  const bases = websiteCandidates(input.wineryWebsite, input.winerySlug);
  if (bases.length === 0) return emptyEnrichment();

  let bestPage: { html: string; finalUrl: string; score: number } | null = null;
  let preferredLocked = false;

  if (
    input.preferredPageUrl &&
    input.winerySlug === "cramele-recas" &&
    input.preferredPageUrl.includes("cramelerecas.ro")
  ) {
    const preferred = await fetchProducerHtml(input.preferredPageUrl);
    const preferredFacts = preferred
      ? parseRecasProducerFacts(preferred.html, preferred.finalUrl)
      : null;
    if (preferred && preferredFacts) {
      bestPage = { ...preferred, score: 100 };
      preferredLocked = true;
    }
  }

  if (!preferredLocked) {
    for (const base of bases) {
      const slugFromUrl =
        input.preferredPageUrl && input.winerySlug === "cramele-recas"
          ? extractRecasSlugFromUrl(input.preferredPageUrl)
          : null;
      const extraCandidates =
        slugFromUrl != null ? buildRecasUrlCandidates(base, slugFromUrl) : [];

      const candidates = [
        ...extraCandidates,
        ...buildProductPageCandidates(base, input.wineName, input.winerySlug),
      ];
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
