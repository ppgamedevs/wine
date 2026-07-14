export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function murfatlarVariantHashFromUrl(url: URL): string {
  const key = url.hash.replace(/^#/, "").toLowerCase();
  if (!key) return "";
  if (key === "rosu" || key === "roze" || key === "alb" || key.startsWith("variant-")) {
    return key;
  }
  return "";
}

function shouldPreserveSourceHash(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "murfatlar-vinul.ro") return false;
  return murfatlarVariantHashFromUrl(url).length > 0;
}

export function normalizeSourceUrl(raw: string): string {
  const withProtocol = raw.trim().startsWith("http")
    ? raw.trim()
    : `https://${raw.trim()}`;
  const url = new URL(withProtocol);
  const preserveHash = shouldPreserveSourceHash(url);
  if (!preserveHash) {
    url.hash = "";
  }
  let normalized = url.toString();
  if (!preserveHash && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

const BARE_DOMAIN_PATTERN =
  /^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^\s]*)?$/i;

/** True when the user is typing or pasting something that looks like a URL. */
export function looksLikeUrlAttempt(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (BARE_DOMAIN_PATTERN.test(trimmed)) return true;
  if (/^(?:www\.)?[a-z0-9-]+\.(?:ro|com|eu|net|org)(?:\/|\s|$)/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function isWineUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || !looksLikeUrlAttempt(trimmed)) return false;

  try {
    normalizeSourceUrl(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function buildWineSlug(input: {
  producer: string;
  name: string;
  vintage?: number | null;
}): string {
  return slugify(
    [
      slugify(input.producer),
      slugify(input.name),
      input.vintage ? String(input.vintage) : "",
    ]
      .filter(Boolean)
      .join("-"),
  );
}
