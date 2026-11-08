/**
 * Conservative merchant product-stock extraction. Global "indisponibil"
 * text can refer to unrelated recommendations and never establishes stock.
 */
export function parseProductStockAvailability(html: string): boolean | null {
  function classify(value: unknown): boolean | null {
    if (typeof value !== "string") return null;
    const text = value.toLowerCase().replace(/[^a-z]/g, "");
    if (text.endsWith("outofstock") || text === "soldout") return false;
    if (text.endsWith("instock")) return true;
    return null;
  }

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/\b(?:property|name)\s*=\s*["'](?:product:availability|og:availability)["']/i.test(tag)) continue;
    const value = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    const result = classify(value);
    if (result !== null) return result;
  }

  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try { parsed = JSON.parse(match[1] ?? ""); } catch { continue; }
    const roots = Array.isArray(parsed) ? parsed : [parsed];
    const products: Record<string, unknown>[] = [];
    for (const item of roots) {
      if (item === null || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const entries: unknown[] = Array.isArray(record["@graph"]) ? record["@graph"] : [record];
      for (const node of entries) {
        if (node === null || typeof node !== "object") continue;
        const product = node as Record<string, unknown>;
        const types = Array.isArray(product["@type"]) ? product["@type"] : [product["@type"]];
        if (types.includes("Product")) products.push(product);
      }
    }
    if (products.length !== 1) continue;
    const offersValue = products[0]?.offers;
    const offers = Array.isArray(offersValue) ? offersValue : [offersValue];
    const statuses = offers.map(offer =>
      offer !== null && typeof offer === "object"
        ? classify((offer as Record<string, unknown>).availability)
        : null,
    ).filter((result): result is boolean => result !== null);
    if (statuses.length > 0 && statuses.every(x => x === statuses[0])) return statuses[0]!;
  }
  return null;
}
