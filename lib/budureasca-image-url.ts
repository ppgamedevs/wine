/** Magento serves tiny thumbnails under /cache/{hash}/; strip for full resolution. */
export function upgradeBudureascaImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (host !== "budureasca.ro" && host !== "www.budureasca.ro") {
      return url.trim();
    }

    const upgraded = parsed.pathname.replace(
      /\/media\/catalog\/product\/cache\/[^/]+\/(.+)/,
      "/media/catalog/product/$1",
    );
    if (upgraded === parsed.pathname) return url.trim();

    parsed.pathname = upgraded;
    return parsed.toString();
  } catch {
    return url.trim();
  }
}
