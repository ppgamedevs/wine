const PRICE_MENTION = /\b(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:RON|lei)\b/gi;

export function extractEditorialPrices(text: string | null | undefined): number[] {
  if (!text?.trim()) return [];
  const prices: number[] = [];
  for (const match of text.matchAll(PRICE_MENTION)) {
    const value = Number.parseFloat(match[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0) prices.push(value);
  }
  return prices;
}

/**
 * Price-dependent prose is immutable historical evidence. We never rewrite it
 * silently. When it disagrees with the current verified offer, the page labels
 * it as historical and states both prices explicitly.
 */
export function commercialEditorialNotice(
  texts: Array<string | null | undefined>,
  verifiedPrice: number | null,
  locale: "ro" | "en",
): string | null {
  const mentions = [
    ...new Set(texts.flatMap((text) => extractEditorialPrices(text))),
  ].sort((a, b) => a - b);
  if (mentions.length === 0) return null;
  if (
    verifiedPrice != null &&
    mentions.every((price) => Math.round(price) === Math.round(verifiedPrice))
  ) {
    return null;
  }

  const mentioned = mentions.map((price) => `${Math.round(price)} RON`).join(", ");
  if (verifiedPrice == null) {
    return locale === "en"
      ? `Historical analysis. The text mentions ${mentioned}, but no current verified Profitshare offer is available; this is not a current price.`
      : `Analiză istorică. Textul menționează ${mentioned}, dar în prezent nu există o ofertă Profitshare verificată; nu este un preț curent.`;
  }
  return locale === "en"
    ? `Historical analysis. The text mentions ${mentioned}, while the current verified offer is ${Math.round(verifiedPrice)} RON.`
    : `Analiză istorică. Textul menționează ${mentioned}, iar oferta verificată actuală este ${Math.round(verifiedPrice)} RON.`;
}
