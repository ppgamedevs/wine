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

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function isSafePublicWineUrl(input: string): boolean {
  if (!isWineUrl(input)) return false;

  try {
    const url = new URL(normalizeSourceUrl(input));
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const disallowedHostname =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "metadata.google.internal";
    const allowedPort =
      url.port === "" || url.port === "80" || url.port === "443";

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      allowedPort &&
      !disallowedHostname &&
      !isPrivateIpv4(hostname) &&
      !isPrivateIpv6(hostname)
    );
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
