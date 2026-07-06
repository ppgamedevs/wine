const RECOMMENDED_SLUGS_LINE = /^RECOMMENDED_SLUGS:\s*(.+)$/im;
const URL_PATTERN = /https?:\/\/[^\s)\]>]+/gi;

function parseSlugLine(line: string, candidateSlugs: string[]): string[] {
  const slugSet = new Set(candidateSlugs);
  const slugs: string[] = [];

  for (const token of line.split(/[,;]+/)) {
    const slug = token.trim().replace(/^[-*]\s*/, "");
    if (!slug || !slugSet.has(slug) || slugs.includes(slug)) continue;
    slugs.push(slug);
    if (slugs.length >= 2) break;
  }

  return slugs;
}

function findMentionedSlugs(text: string, candidateSlugs: string[]): string[] {
  const normalized = text.toLowerCase();
  const slugs: string[] = [];

  for (const slug of candidateSlugs) {
    if (!normalized.includes(slug) || slugs.includes(slug)) continue;
    slugs.push(slug);
    if (slugs.length >= 2) break;
  }

  return slugs;
}

/** Parse up to two wine slugs chosen by the LLM from its full response. */
export function extractRecommendedSlugs(
  llmText: string,
  candidateSlugs: string[],
): string[] {
  const lineMatch = llmText.match(RECOMMENDED_SLUGS_LINE);
  if (lineMatch?.[1]) {
    const fromLine = parseSlugLine(lineMatch[1], candidateSlugs);
    if (fromLine.length > 0) return fromLine;
  }

  return findMentionedSlugs(llmText, candidateSlugs);
}

/** Strip machine-readable slug line and raw URLs from assistant chat text. */
export function sanitizeAssistantChatText(text: string): string {
  return text
    .replace(RECOMMENDED_SLUGS_LINE, "")
    .replace(URL_PATTERN, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
