export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeSourceUrl(raw: string): string {
  const withProtocol = raw.trim().startsWith("http")
    ? raw.trim()
    : `https://${raw.trim()}`;
  const url = new URL(withProtocol);
  url.hash = "";
  let normalized = url.toString();
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function isWineUrl(input: string): boolean {
  try {
    normalizeSourceUrl(input);
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
