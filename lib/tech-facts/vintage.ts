/**
 * Vintage identity for technical sources. Avoid medal, copyright, and footer years.
 */
import { isValidWineVintage } from "@/lib/wine-vintage";

const TRAP_WINDOW = 48;

const TRAP_PATTERNS = [
  /medal|medalie|aur|argint|bronz|gold|silver|bronze/i,
  /concurs|competition|award|premiu|trophy/i,
  /copyright|©|all rights reserved|toate drepturile/i,
  /footer|politica de confidentialitate|privacy policy/i,
];

const HEADING_PATTERNS = [
  /(?:^|\n)\s*([^\n]{3,80}\b(19\d{2}|20[0-3]\d)\b[^\n]{0,40})/,
  /\b(?:an(?:ul)?|vintage|recolta|editia)\s*[:\s-]*\b(19\d{2}|20[0-3]\d)\b/i,
  /\b(19\d{2}|20[0-3]\d)\s*(?:recolta|vintage)\b/i,
];

function yearFromMatch(token: string): number | null {
  const year = Number.parseInt(token, 10);
  return isValidWineVintage(year) ? year : null;
}

function isTrapContext(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - TRAP_WINDOW), index + TRAP_WINDOW);
  return TRAP_PATTERNS.some((pattern) => pattern.test(window));
}

export function extractVintageFromFilename(filename: string | null | undefined): number | null {
  if (!filename) return null;
  const match = filename.match(/(19\d{2}|20[0-3]\d)/);
  if (!match?.[1]) return null;
  if (/medal|concurs|award|copyright/i.test(filename)) return null;
  return yearFromMatch(match[1]);
}

export function extractTechnicalSourceVintage(input: {
  text: string;
  title?: string | null;
  heading?: string | null;
  filename?: string | null;
}): number | null {
  const heading = input.heading?.trim() || input.title?.trim() || "";
  if (heading) {
    const labeled = heading.match(/\b(19\d{2}|20[0-3]\d)\b/);
    if (labeled?.[1] && !isTrapContext(heading, labeled.index ?? 0)) {
      const year = yearFromMatch(labeled[1]);
      if (year != null) return year;
    }
  }

  const fromFile = extractVintageFromFilename(input.filename);
  if (fromFile != null) return fromFile;

  for (const pattern of HEADING_PATTERNS) {
    const match = input.text.match(pattern);
    const token = match?.[2] ?? match?.[1];
    if (!token || match?.index == null) continue;
    const yearToken = token.match(/(19\d{2}|20[0-3]\d)/)?.[1];
    if (!yearToken) continue;
    if (isTrapContext(input.text, match.index)) continue;
    const year = yearFromMatch(yearToken);
    if (year != null) return year;
  }

  return null;
}
