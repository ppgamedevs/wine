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
  if (/\b(gold|aur)\b/.test(lower)) return "gold";
  if (/\b(silver|argint)\b/.test(lower)) return "silver";
  if (/\b(bronze|bronz)\b/.test(lower)) return "bronze";
  return "other";
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

function parseRecasMedalToken(token: string): WineMedal | null {
  const alt = token.trim();
  if (
    !/vinarium|mundus|berliner|iwc|vinalies|wine.?lover|concours|trophy|decanter|balkans|medal|_20\d{2}|aur\b|gold|silver|bronze/i.test(
      alt,
    )
  ) {
    return null;
  }

  const yearMatch =
    alt.match(/(?:^|[_\-\s])(20\d{2}|19\d{2})(?:[^\d]|$)/) ??
    alt.match(/(20\d{2})\d{1,2}(?:\D|$)/) ??
    alt.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch?.[1] ? Number.parseInt(yearMatch[1], 10) : null;

  const rules: Array<{
    pattern: RegExp;
    competition: string;
    medal: WineMedal["medal"];
    importance: WineMedal["importance"];
    country?: string;
  }> = [
    {
      pattern: /vinarium|iwcb/i,
      competition: "VINARIUM International Wine Contest",
      medal: "gold",
      importance: "high",
      country: "Romania",
    },
    {
      pattern: /mundus/i,
      competition: "Mundus Vini",
      medal: "gold",
      importance: "high",
      country: "Germany",
    },
    {
      pattern: /vinalies/i,
      competition: "Vinalies Internationales",
      medal: "gold",
      importance: "high",
      country: "France",
    },
    {
      pattern: /berliner/i,
      competition: "Berliner Wein Trophy",
      medal: "gold",
      importance: "high",
      country: "Germany",
    },
    {
      pattern: /iwc/i,
      competition: "International Wine Challenge",
      medal: "gold",
      importance: "high",
      country: "UK",
    },
    {
      pattern: /wine.?lover/i,
      competition: "Wine Lovers Meeting",
      medal: "gold",
      importance: "medium",
      country: "Romania",
    },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(alt)) {
      return {
        year,
        competition: rule.competition,
        medal: parseMedalLevelFromText(alt) === "other" ? rule.medal : parseMedalLevelFromText(alt),
        importance: rule.importance,
        ...(rule.country ? { country: rule.country } : {}),
      };
    }
  }

  if (/gold|aur|silver|argint|bronze|bronz|medal/i.test(alt)) {
    const competition = alt
      .replace(/^\d+_/, "")
      .replace(/[_-]+/g, " ")
      .trim();
    return {
      year,
      competition: competition || alt,
      medal: parseMedalLevelFromText(alt),
      importance: medalImportance(competition),
    };
  }

  return null;
}

/** Medalii Recas: carusel cu alt/src pe imagini (toate slide-urile sunt in HTML). */
export function parseRecasMedalsFromHtml(html: string): WineMedal[] {
  const tokens = new Set<string>();

  for (const match of html.matchAll(/(?:alt|src)=["']([^"']+)["']/gi)) {
    const value = match[1]?.trim();
    if (value) tokens.add(value);
  }

  for (const match of html.matchAll(
    /data-elementor-lightbox-title=["']([^"']+)["']/gi,
  )) {
    const value = match[1]?.trim();
    if (value) tokens.add(value);
  }

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
