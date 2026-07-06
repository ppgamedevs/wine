import { eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wineries } from "@/lib/schema";
import { slugify } from "@/lib/wine-url";

const RETAILER_NAMES = new Set([
  "emag",
  "altex",
  "flanco",
  "evomag",
  "profitshare",
  "amazon",
  "carrefour",
  "auchan",
  "metro",
  "kaufland",
]);

/** Aliases mapped to canonical winery names when not yet in DB. */
export const KNOWN_WINERY_ALIASES: { name: string; aliases: string[] }[] = [
  { name: "Cramele Recas", aliases: ["recas", "recaș", "cramele recas", "cramele-recas"] },
  { name: "Purcari", aliases: ["purcari", "chateau purcari", "vinaria purcari"] },
  { name: "Avincis", aliases: ["avincis"] },
  { name: "Davino", aliases: ["davino"] },
  { name: "Cotnari", aliases: ["cotnari"] },
  { name: "Jidvei", aliases: ["jidvei"] },
  { name: "Budureasca", aliases: ["budureasca"] },
  { name: "Liliac", aliases: ["liliac", "liliac winery"] },
  { name: "Lacerta", aliases: ["lacerta", "lacertawinery"] },
  { name: "Domeniile Averesti", aliases: ["averesti", "averești", "domeniile averesti"] },
  { name: "Gitana", aliases: ["gitana"] },
  { name: "Oprisor", aliases: ["oprisor", "oprișor"] },
  { name: "Serve", aliases: ["serve", "crama serve"] },
  { name: "Tohani", aliases: ["tohani"] },
  { name: "Columna", aliases: ["columna"] },
  { name: "Museum", aliases: ["crama museum", "museum"] },
];

export interface WineryDetectionInput {
  producer: string;
  wineName: string;
  pageText: string;
  finalUrl: string;
}

function normalizeMatchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRetailerName(value: string): boolean {
  const normalized = normalizeMatchText(value);
  if (!normalized) return true;
  return RETAILER_NAMES.has(normalized.split(/\s+/)[0] ?? normalized);
}

function buildHaystack(input: WineryDetectionInput): string {
  let hostname = "";
  try {
    hostname = new URL(input.finalUrl).hostname;
  } catch {
    hostname = input.finalUrl;
  }

  return normalizeMatchText(
    [input.producer, input.wineName, input.pageText.slice(0, 8_000), hostname].join(
      " ",
    ),
  );
}

function aliasMatchesHaystack(alias: string, haystack: string): boolean {
  const normalizedAlias = normalizeMatchText(alias);
  if (!normalizedAlias) return false;
  if (haystack.includes(normalizedAlias)) return true;

  const aliasSlug = slugify(alias);
  return aliasSlug.length > 2 && haystack.includes(aliasSlug.replace(/-/g, " "));
}

function scoreWineryNameMatch(name: string, haystack: string): number {
  const normalizedName = normalizeMatchText(name);
  if (!normalizedName) return 0;
  if (haystack.includes(normalizedName)) return normalizedName.length + 100;

  const slug = slugify(name).replace(/-/g, " ");
  if (slug.length > 2 && haystack.includes(slug)) return slug.length + 50;

  const tokens = normalizedName.split(/\s+/).filter((token) => token.length > 3);
  const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
  return tokenHits > 0 ? tokenHits * 10 : 0;
}

export function detectWineryName(input: WineryDetectionInput): string | null {
  const haystack = buildHaystack(input);
  const producer = input.producer.trim();

  if (producer && !isRetailerName(producer)) {
    return producer;
  }

  let bestName: string | null = null;
  let bestScore = 0;

  for (const entry of KNOWN_WINERY_ALIASES) {
    for (const alias of entry.aliases) {
      if (aliasMatchesHaystack(alias, haystack)) {
        const score = scoreWineryNameMatch(entry.name, haystack) + entry.name.length;
        if (score > bestScore) {
          bestScore = score;
          bestName = entry.name;
        }
      }
    }
  }

  return bestName;
}

export async function findWineryByNameInsensitive(
  name: string,
): Promise<(typeof wineries.$inferSelect) | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const exact = await db.query.wineries.findFirst({
    where: sql`lower(${wineries.name}) = lower(${trimmed})`,
  });
  if (exact) return exact;

  const bySlug = await db.query.wineries.findFirst({
    where: eq(wineries.slug, slugify(trimmed)),
  });
  if (bySlug) return bySlug;

  const allWineries = await db.select().from(wineries);
  const normalizedSearch = normalizeMatchText(trimmed);

  for (const winery of allWineries) {
    const normalizedName = normalizeMatchText(winery.name);
    if (
      normalizedName === normalizedSearch ||
      normalizedName.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedName)
    ) {
      return winery;
    }
  }

  return null;
}

export async function detectWineryNameFromCatalog(
  input: WineryDetectionInput,
): Promise<(string | null)> {
  const haystack = buildHaystack(input);
  const producerCandidate = input.producer.trim();

  if (producerCandidate && !isRetailerName(producerCandidate)) {
    const fromProducer = await findWineryByNameInsensitive(producerCandidate);
    if (fromProducer) return fromProducer.name;
    return producerCandidate;
  }

  const catalogWineries = await db
    .select({ name: wineries.name })
    .from(wineries)
    .orderBy(sql`length(${wineries.name}) desc`);

  let bestName: string | null = null;
  let bestScore = 0;

  for (const { name } of catalogWineries) {
    const score = scoreWineryNameMatch(name, haystack);
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }

  if (bestName && bestScore >= 20) {
    return bestName;
  }

  const fromAliases = detectWineryName(input);
  if (fromAliases) return fromAliases;

  return null;
}

function inferWineryWebsite(finalUrl: string, wineryName: string): string | undefined {
  try {
    const host = new URL(finalUrl).hostname.toLowerCase();
    if (!isRetailerName(host) && !host.includes("profitshare")) {
      return new URL(finalUrl).origin;
    }
  } catch {
    return undefined;
  }

  const aliasEntry = KNOWN_WINERY_ALIASES.find(
    (entry) => normalizeMatchText(entry.name) === normalizeMatchText(wineryName),
  );
  const slug = slugify(aliasEntry?.aliases[0] ?? wineryName);
  if (!slug) return undefined;
  return `https://www.${slug}.ro`;
}

export async function resolveWineryIdFromDetection(
  input: WineryDetectionInput,
  regionId: number | null,
): Promise<number> {
  const detectedName = await detectWineryNameFromCatalog(input);
  if (!detectedName) {
    throw new Error("Nu am putut detecta crama pentru acest vin.");
  }

  const existing = await findWineryByNameInsensitive(detectedName);
  if (existing) return existing.id;

  const winerySlug = slugify(detectedName);
  const website = inferWineryWebsite(input.finalUrl, detectedName);

  const [created] = await db
    .insert(wineries)
    .values({
      slug: winerySlug,
      name: detectedName,
      regionId,
      website,
      verified: false,
      status: "user_submitted",
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created.id;

  const fallback = await db.query.wineries.findFirst({
    where: or(eq(wineries.slug, winerySlug), sql`lower(${wineries.name}) = lower(${detectedName})`),
  });
  if (!fallback) throw new Error("Nu am putut crea crama.");
  return fallback.id;
}
