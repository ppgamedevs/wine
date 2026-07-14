const MIN_WINE_VINTAGE = 1990;

/**
 * Anul maxim valid pentru un vintage NU este un an fix hardcodat (risc: se
 * demodeaza si respinge/accepta gresit an de an), ci "anul curent + 1":
 * unele crame lanseaza vinul noii recolte inainte de finalul anului
 * calendaristic, dar un vintage din viitor mai indepartat este aproape
 * sigur o eroare de extractie sau introducere.
 */
export function getMaxValidWineVintage(referenceYear?: number): number {
  return (referenceYear ?? new Date().getFullYear()) + 1;
}

const LABELED_VINTAGE_PATTERNS = [
  /(?:pentru\s+)?vintage\s+(20\d{2}|19\d{2})/i,
  /(?:an(?:ul)?(?:\s+\w+){0,4}\s*(?:recoltei|recolta|vinului|productie|prod\.?))[\s:.-]*?(20\d{2}|19\d{2})/i,
  /(?:^|[\s>])An\s*(20\d{2}|19\d{2})\b/i,
  /(?:vintage|recolta|crop\s+year)[\s:.-]*?(20\d{2}|19\d{2})/i,
  /\b(?:edi[tț]ia|editia)\s+(20\d{2}|19\d{2})\b/i,
  /\bSolo\s+Quinta\s+(20\d{2}|19\d{2})\b/i,
  /\b(20\d{2}|19\d{2})\s*(?:recolta|vintage)\b/i,
] as const;

const BARE_VINTAGE_PATTERN = /\b(19[89]\d|20[0-3]\d)\b/g;

export function isValidWineVintage(
  year: number,
  referenceYear?: number,
): boolean {
  return (
    Number.isInteger(year) &&
    year >= MIN_WINE_VINTAGE &&
    year <= getMaxValidWineVintage(referenceYear)
  );
}

function parseVintageToken(token: string): number | null {
  const year = Number.parseInt(token, 10);
  return isValidWineVintage(year) ? year : null;
}

export function parseVintageFromSlug(
  slug: string | null | undefined,
): number | null {
  if (!slug) return null;

  const tailMatch = slug.match(/-(19\d{2}|20[0-3]\d)$/);
  if (tailMatch?.[1]) {
    return parseVintageToken(tailMatch[1]);
  }

  return null;
}

export function parseVintageFromBareText(
  text: string | null | undefined,
): number | null {
  if (!text) return null;

  const years: number[] = [];
  for (const match of text.matchAll(BARE_VINTAGE_PATTERN)) {
    const year = match[1] ? parseVintageToken(match[1]) : null;
    if (year != null) years.push(year);
  }

  if (years.length === 0) return null;
  return years[years.length - 1] ?? null;
}

export function extractVintageFromPageText(
  pageText: string | null | undefined,
): number | null {
  if (!pageText) return null;

  for (const pattern of LABELED_VINTAGE_PATTERNS) {
    const match = pageText.match(pattern);
    if (match?.[1]) {
      const year = parseVintageToken(match[1]);
      if (year != null) return year;
    }
  }

  return null;
}

export function extractVintageFromHtml(
  html: string | null | undefined,
): number | null {
  if (!html) return null;

  const descriptionMatch = html.match(
    /(?:Descriere|description)[\s\S]{0,120}?<\/h\d>([\s\S]{0,6000})/i,
  );
  if (descriptionMatch?.[1]) {
    const fromDescription = extractVintageFromPageText(
      descriptionMatch[1].replace(/<[^>]+>/g, " "),
    );
    if (fromDescription != null) return fromDescription;
  }

  const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  return extractVintageFromPageText(stripped.replace(/<[^>]+>/g, " "));
}

export function resolveWineVintage(input: {
  vintage?: number | null;
  name?: string | null;
  slug?: string | null;
  pageText?: string | null;
  html?: string | null;
}): number | null {
  if (input.vintage != null) return input.vintage;

  const fromSlug = parseVintageFromSlug(input.slug);
  if (fromSlug != null) return fromSlug;

  const fromName = parseVintageFromBareText(input.name);
  if (fromName != null) return fromName;

  if (input.html) {
    const fromHtml = extractVintageFromHtml(input.html);
    if (fromHtml != null) return fromHtml;
  }

  const fromPage = extractVintageFromPageText(input.pageText);
  if (fromPage != null) return fromPage;

  return null;
}

export function stripEmbeddedVintageFromName(
  name: string,
  vintage: number | null | undefined,
): string {
  if (!name.trim() || vintage == null) return name.trim();

  const stripped = name
    .replace(new RegExp(`\\s${vintage}(?=\\s*\\(|$)`, "i"), "")
    .trim();

  return stripped || name.trim();
}

/** Title with a single trailing vintage (never duplicated). */
export function buildWineFullTitle(
  name: string,
  vintage: number | null | undefined,
): string {
  const base = stripEmbeddedVintageFromName(name, vintage);
  if (vintage == null) return base;
  return `${base} ${vintage}`;
}

export function resolveStoredWineVintage(input: {
  vintage?: number | null;
  name: string;
  slug: string;
  pageText: string;
  html?: string;
}): number | null {
  return resolveWineVintage(input);
}
