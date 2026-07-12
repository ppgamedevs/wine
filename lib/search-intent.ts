function normalizeForIntent(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const QUESTION_START =
  /^(ce|cum|de ce|cat|cate|care|unde|cand|pot|poti|exista|este|sunt|ai|am|as|de unde|in ce|la ce)\b/;

const SOMMELIER_PHRASES: RegExp[] = [
  /\bce inseamna\b/,
  /\bce este\b/,
  /\bce e\b/,
  /\bcare e\b/,
  /\bcare este\b/,
  /\bcare sunt\b/,
  /\bde ce\b/,
  /\bcum se\b/,
  /\bcum pot\b/,
  /\bexplica(te)?\b/,
  /\brecomand(a|at|ati)?\b/,
  /\bspune(-mi)?\b/,
  /\bajuta(-ma)?\b/,
  /\bdiferenta\b/,
  /\bce vin\b/,
  /\bcare vin\b/,
  /\bvin (bun|potrivit|recomandat|pentru)\b/,
  /\bvinuri (pentru|sub)\b/,
  /\b(pentru|la|cu) (sarmale|gratar|cozonac|desert|nunta|cina|cadou|peste|carne|miel)\b/,
  /\bmerge (cu|la|pentru)\b/,
  /\bpotrivit pentr/,
  /\basocier(e|i|ea|i)\b/,
  /\bpairing\b/,
  /\bsomelier\b/,
  /\bbuget\b/,
  /\bsub \d+\s*(lei|ron)\b/,
  /\bintre \d+\s*(si|–|-)\s*\d+\s*(lei|ron)\b/,
  /\bocazie\b/,
  /\btemperatur(a|i)\b/,
  /\bdecant/,
  /\btanin/,
  /\bbaric/,
  /\bfermentat/,
  /\bce (soi|sort|tip|stil)\b/,
  /\bcare (soi|sort|tip|stil)\b/,
];

/** True when the user asks a wine question rather than searching the catalog by name. */
export function isSommelierQuery(raw: string): boolean {
  const query = normalizeForIntent(raw);
  if (query.length < 3) return false;

  if (query.endsWith("?")) return true;
  if (QUESTION_START.test(query)) return true;

  return SOMMELIER_PHRASES.some((pattern) => pattern.test(query));
}

export function sommelierQueryHref(raw: string): string {
  return `/ai-sommelier?q=${encodeURIComponent(raw.trim())}`;
}
