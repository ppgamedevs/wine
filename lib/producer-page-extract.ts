import { resolveBallaGezaWineFromCatalog } from "@/lib/ballageza-producer";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import type { WineMedal, ProducerPageContent } from "@/lib/schema";
import {
  isHighImportanceCompetition,
  normalizeMedalLevel,
  normalizeWineMedals,
} from "@/lib/wine-medals";

export interface ProducerPageExtract {
  pageUrl: string;
  richText: string;
  medals: WineMedal[];
  content: ProducerPageContent;
}

/** Păstrează alt/title din imagini (medalii în carusel Recas etc.). */
export function htmlToRichText(html: string): string {
  const withMeta = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(
      /<img[^>]+alt=["']([^"']+)["'][^>]*>/gi,
      " [IMG: $1] ",
    )
    .replace(
      /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
      " [IMG_SRC: $1] ",
    );

  return stripHtml(withMeta).replace(/\s+/g, " ").trim();
}

function extractHtmlSectionByPattern(
  html: string,
  heading: RegExp,
): string | null {
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  for (let i = 0; i < headings.length; i += 1) {
    const title = stripHtml(headings[i]?.[1] ?? "").trim();
    if (!heading.test(title)) continue;

    const start = (headings[i]?.index ?? 0) + (headings[i]?.[0]?.length ?? 0);
    const nextIndex = headings[i + 1]?.index ?? html.length;
    const sectionHtml = html.slice(start, nextIndex);
    const text = stripHtml(sectionHtml).replace(/\s+/g, " ").trim();
    return text || null;
  }
  return null;
}

function medalImportance(competition: string): WineMedal["importance"] {
  return isHighImportanceCompetition(competition) ? "high" : "medium";
}

function parseMedalLevelFromText(raw: string): WineMedal["medal"] {
  const lower = raw.toLowerCase();
  if (lower.includes("double gold") || lower.includes("great gold") || lower.includes("grande medaille")) {
    return "double_gold";
  }
  if (/\bcommended\b|\bcommende/i.test(lower)) {
    return "other";
  }
  if (/\b(gold|aur)\b/.test(lower)) return "gold";
  if (/\b(silver|argint)\b/.test(lower)) return "silver";
  if (/\b(bronze|bronz)\b/.test(lower)) return "bronze";
  return "other";
}

function normalizeRecasMedalToken(raw: string): string {
  let token = raw.trim();
  if (!token) return "";

  if (/^https?:\/\//i.test(token) || /\/wp-content\//i.test(token)) {
    const fileName = token.split("/").pop()?.replace(/\.[^.]+$/, "") ?? token;
    token = fileName.replace(/-/g, " ");
  }

  return token
    .replace(/\s*-\s*copie\s*\d*/gi, "")
    .replace(/\.+$/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYearFromRecasToken(token: string): number | null {
  const typoYear = token.match(/\b(20\d{2}|19\d{2})\d{1,2}\b/);
  if (typoYear?.[1]) {
    const parsed = Number.parseInt(typoYear[1], 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  const matches = [...token.matchAll(/\b(20\d{2}|19\d{2})\b/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1]?.[1];
  if (!last) return null;
  const year = Number.parseInt(last, 10);
  return Number.isFinite(year) ? year : null;
}

function isLikelyRecasMedalToken(normalized: string): boolean {
  return /vinarium|iwcb|mundus|berliner|iwsc|iwc|vinalies|wine lover|decanter|frankfurt|bruxelles|brussels|vinvest|asia wine|balkans|trophy|medal|concours|contest|awards|commended|commende|\b(20\d{2}|19\d{2})\b|\b(aur|gold|silver|argint|bronze)\b/i.test(
    normalized,
  );
}

const RECAS_COMPETITION_RULES: Array<{
  pattern: RegExp;
  competition: string;
  defaultMedal: WineMedal["medal"];
  importance: WineMedal["importance"];
  country?: string;
}> = [
  {
    pattern: /decanter/i,
    competition: "Decanter Wine Awards",
    defaultMedal: "gold",
    importance: "high",
    country: "UK",
  },
  {
    pattern: /vinarium|iwcb/i,
    competition: "VINARIUM International Wine Contest",
    defaultMedal: "gold",
    importance: "high",
    country: "Romania",
  },
  {
    pattern: /mundus/i,
    competition: "Mundus Vini",
    defaultMedal: "gold",
    importance: "high",
    country: "Germany",
  },
  {
    pattern: /vinalies/i,
    competition: "Vinalies Internationales",
    defaultMedal: "gold",
    importance: "high",
    country: "France",
  },
  {
    pattern: /berliner/i,
    competition: "Berliner Wein Trophy",
    defaultMedal: "gold",
    importance: "high",
    country: "Germany",
  },
  {
    pattern: /iwsc|iwc/i,
    competition: "International Wine Challenge",
    defaultMedal: "gold",
    importance: "high",
    country: "UK",
  },
  {
    pattern: /frankfurt/i,
    competition: "Frankfurt International Wine Trophy",
    defaultMedal: "gold",
    importance: "high",
    country: "Germany",
  },
  {
    pattern: /bruxelles|brussels/i,
    competition: "Concours Mondial de Bruxelles",
    defaultMedal: "silver",
    importance: "high",
    country: "Belgium",
  },
  {
    pattern: /vinvest/i,
    competition: "Vinvest Romania",
    defaultMedal: "gold",
    importance: "medium",
    country: "Romania",
  },
  {
    pattern: /asia wine trophy/i,
    competition: "Asia Wine Trophy",
    defaultMedal: "gold",
    importance: "high",
  },
  {
    pattern: /wine lover/i,
    competition: "Wine Lovers Meeting",
    defaultMedal: "gold",
    importance: "medium",
    country: "Romania",
  },
  {
    pattern: /balkans/i,
    competition: "Balkans International Wine Competition",
    defaultMedal: "gold",
    importance: "high",
  },
];

function extractRecasMedalCarouselHtml(html: string): string {
  const medalSwiper = html.match(
    /id=["']medalSwiper["'][\s\S]*?elementor-swiper-button-prev/i,
  );
  if (medalSwiper?.[0]) return medalSwiper[0];

  const medalHeading = html.match(
    /Medalii[\s\S]*?swiper-wrapper[\s\S]*?elementor-swiper-button-prev/i,
  );
  return medalHeading?.[0] ?? html;
}

function collectRecasMedalTokens(carouselHtml: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const add = (value: string | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    tokens.push(trimmed);
  };

  for (const match of carouselHtml.matchAll(
    /data-elementor-lightbox-title=["']([^"']+)["']/gi,
  )) {
    add(match[1]);
  }

  for (const match of carouselHtml.matchAll(
    /class=["'][^"']*swiper-slide-image[^"']*["'][^>]*alt=["']([^"']+)["']/gi,
  )) {
    add(match[1]);
  }

  for (const match of carouselHtml.matchAll(
    /alt=["']([^"']+)["'][^>]*class=["'][^"']*swiper-slide-image/gi,
  )) {
    add(match[1]);
  }

  return tokens;
}

function parseRecasMedalToken(raw: string): WineMedal | null {
  const normalized = normalizeRecasMedalToken(raw);
  if (!normalized || !isLikelyRecasMedalToken(normalized)) {
    return null;
  }

  const year = extractYearFromRecasToken(normalized);
  let medalLevel = parseMedalLevelFromText(normalized);
  const isCommended = /\bcommended\b|\bcommende/i.test(normalized);

  for (const rule of RECAS_COMPETITION_RULES) {
    if (!rule.pattern.test(normalized)) continue;

    if (medalLevel === "other" && !isCommended) {
      medalLevel = rule.defaultMedal;
    }

    return {
      year,
      competition: rule.competition,
      medal: medalLevel,
      importance: rule.importance,
      ...(rule.country ? { country: rule.country } : {}),
    };
  }

  if (/trophy|medal|concours|contest|awards/i.test(normalized)) {
    const competition = normalized.replace(/^\d+\s+/, "").trim();
    return {
      year,
      competition: competition || normalized,
      medal: medalLevel === "other" ? "gold" : medalLevel,
      importance: medalImportance(competition),
    };
  }

  return null;
}

/** Medalii Avincis: text liniar „Silver Medal Decanter Wine Awards 2026, UK …”. */
export function parseAvincisMedalsFromPlain(plain: string): WineMedal[] {
  const normalized = plain.replace(/\s+/g, " ");
  if (!/\bMedal\b/i.test(normalized)) return [];

  const medals: WineMedal[] = [];
  const pattern =
    /(Gold|Silver|Bronze|Double Gold)\s+Medal\s+(.+?)(?=\s+(?:Gold|Silver|Bronze|Double Gold)\s+Medal|$)/gi;

  for (const match of normalized.matchAll(pattern)) {
    const medalRaw = match[1] ?? "";
    const body = (match[2] ?? "").trim();
    const compMatch = body.match(
      /^(.+?)\s+(20\d{2}|19\d{2}),\s*(UK|USA|RO|Romania|Bulgaria)(?=\s|$)/,
    );
    if (!compMatch) continue;

    const competition = compMatch[1]?.trim() ?? body;
    const year = Number.parseInt(compMatch[2] ?? "", 10);
    const country = compMatch[3]?.trim();

    medals.push({
      year: Number.isFinite(year) ? year : null,
      competition,
      medal: normalizeMedalLevel(medalRaw),
      ...(country ? { country } : {}),
      importance: medalImportance(competition),
    });
  }

  return medals;
}

/** Medalii Recas: carusel cu lightbox title / alt (toate slide-urile sunt in HTML). */
export function parseRecasMedalsFromHtml(html: string): WineMedal[] {
  const carouselHtml = extractRecasMedalCarouselHtml(html);
  const tokens = collectRecasMedalTokens(carouselHtml);

  const medals: WineMedal[] = [];
  for (const token of tokens) {
    const parsed = parseRecasMedalToken(token);
    if (parsed) medals.push(parsed);
  }

  return medals;
}

export function extractProducerPageFromHtml(
  html: string,
  pageUrl: string,
): ProducerPageExtract {
  const richText = htmlToRichText(html);
  const isAvincis = pageUrl.includes("avincis.ro");
  const isRecas = pageUrl.includes("cramelerecas.ro");
  const isBallaGeza = pageUrl.includes("ballageza.com");

  const medals = normalizeWineMedals(
    isAvincis
      ? parseAvincisMedalsFromPlain(richText)
      : isRecas
        ? parseRecasMedalsFromHtml(html)
        : [],
  );

  const viticulture = isRecas
    ? extractHtmlSectionByPattern(html, /Viticultur[aă]\s+[sș]i\s+vinifica[tț]ie/i)
    : null;

  const tastingNotes = isRecas
    ? extractHtmlSectionByPattern(html, /Note\s+de\s+degustare/i)
    : isAvincis
      ? (() => {
          const plain = richText;
          const start = plain.search(/Produs din|Acest vin are|Culoarea sa este/i);
          if (start < 0) return null;
          return plain.slice(start, start + 1200).trim();
        })()
      : isBallaGeza
        ? (resolveBallaGezaWineFromCatalog(html, pageUrl)?.tastingNotes ?? null)
        : null;

  const culinaryPairings = isRecas
    ? extractHtmlSectionByPattern(html, /Asocieri\s+culinare/i)
    : null;

  const content: ProducerPageContent = {
    ...(viticulture ? { viticulture } : {}),
    ...(tastingNotes ? { tastingNotes } : {}),
    ...(culinaryPairings ? { culinaryPairings } : {}),
    sourceUrls: [pageUrl],
    extractedAt: new Date().toISOString(),
  };

  return {
    pageUrl,
    richText,
    medals,
    content,
  };
}

export function mergeProducerPageExtracts(
  extracts: ProducerPageExtract[],
): {
  medals: WineMedal[];
  content: ProducerPageContent;
  richText: string;
} {
  const allMedals: WineMedal[] = [];
  const richParts: string[] = [];
  const sourceUrls = new Set<string>();
  let viticulture: string | undefined;
  let tastingNotes: string | undefined;
  let culinaryPairings: string | undefined;

  for (const extract of extracts) {
    allMedals.push(...extract.medals);
    if (extract.richText) {
      richParts.push(`--- ${extract.pageUrl} ---\n${extract.richText}`);
    }
    for (const url of extract.content.sourceUrls ?? []) {
      sourceUrls.add(url);
    }
    viticulture ??= extract.content.viticulture;
    tastingNotes ??= extract.content.tastingNotes;
    culinaryPairings ??= extract.content.culinaryPairings;
  }

  return {
    medals: normalizeWineMedals(allMedals),
    content: {
      ...(viticulture ? { viticulture } : {}),
      ...(tastingNotes ? { tastingNotes } : {}),
      ...(culinaryPairings ? { culinaryPairings } : {}),
      sourceUrls: [...sourceUrls],
      extractedAt: new Date().toISOString(),
    },
    richText: richParts.join("\n\n").slice(0, 28_000),
  };
}

export function formatProducerContentForSommelier(
  content: ProducerPageContent | null | undefined,
): string | null {
  if (!content) return null;
  const parts: string[] = [];
  if (content.viticulture?.trim()) {
    parts.push(`Viticultura si vinificatie: ${content.viticulture.trim()}`);
  }
  if (content.tastingNotes?.trim()) {
    parts.push(`Note degustare producator: ${content.tastingNotes.trim()}`);
  }
  if (content.culinaryPairings?.trim()) {
    parts.push(`Asocieri culinare producator: ${content.culinaryPairings.trim()}`);
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}
