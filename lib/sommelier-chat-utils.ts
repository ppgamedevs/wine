const RECOMMENDED_SLUGS_LINE = /^RECOMMENDED_SLUGS:\s*(.+)$/im;
const URL_PATTERN = /https?:\/\/[^\s)\]>]+/gi;

const MAX_RECOMMENDED_SLUGS = 3;

/** Fix frequent LLM gender agreement mistakes in Romanian wine copy. */
const ROMANIAN_GRAMMAR_FIXES: Array<[RegExp, string]> = [
  [/\bunii\s+cupaje\b/gi, "unele cupaje"],
  [/\bunii\s+vinuri\b/gi, "unele vinuri"],
  [/\bunii\s+soiuri\b/gi, "unele soiuri"],
  [/\bunii\s+sorturi\b/gi, "unele sorturi"],
  [/\bunii\s+asambluri\b/gi, "unele asambluri"],
  [
    /\b(unele\s+(?:cupaje|vinuri|soiuri|sorturi|asambluri)[^.!?]{0,120}?)\biar\s+alții\b/gi,
    "$1iar altele",
  ],
  [
    /\b(unele\s+(?:cupaje|vinuri|soiuri|sorturi|asambluri)[^.!?]{0,120}?)\biar\s+altii\b/gi,
    "$1iar altele",
  ],
];

function fixRomanianGrammar(text: string): string {
  let fixed = text;
  for (const [pattern, replacement] of ROMANIAN_GRAMMAR_FIXES) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

function cleanSlugToken(token: string): string {
  return token
    .trim()
    .replace(/^[-*`\s]+|[-*`\s]+$/g, "")
    .replace(/^["']|["']$/g, "");
}

function parseSlugLine(line: string, candidateSlugs: string[]): string[] {
  const slugSet = new Set(candidateSlugs);
  const slugs: string[] = [];

  for (const token of line.split(/[,;]+/)) {
    const slug = cleanSlugToken(token);
    if (!slug || !slugSet.has(slug) || slugs.includes(slug)) continue;
    slugs.push(slug);
    if (slugs.length >= MAX_RECOMMENDED_SLUGS) break;
  }

  return slugs;
}

function findMentionedSlugs(text: string, candidateSlugs: string[]): string[] {
  const normalized = text.toLowerCase();
  const slugs: string[] = [];

  for (const slug of candidateSlugs) {
    if (!normalized.includes(slug) || slugs.includes(slug)) continue;
    slugs.push(slug);
    if (slugs.length >= MAX_RECOMMENDED_SLUGS) break;
  }

  return slugs;
}

/** Parse up to three wine slugs chosen by the LLM from its full response. */
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
  return fixRomanianGrammar(
    text
      .replace(RECOMMENDED_SLUGS_LINE, "")
      .replace(URL_PATTERN, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}
