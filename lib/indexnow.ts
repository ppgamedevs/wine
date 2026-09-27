import { envOrUndefined } from "@/lib/env";
import { absoluteUrl, SITE } from "@/lib/seo";

const INDEXNOW_API_URL = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_REQUEST = 10_000;

export interface IndexNowSubmitResult {
  ok: boolean;
  status: number;
  submitted: number;
  message?: string;
}

function getIndexNowHost(): string {
  return new URL(SITE.url).host;
}

export function getIndexNowKey(): string | undefined {
  return envOrUndefined("INDEXNOW_KEY");
}

export function getIndexNowKeyLocation(): string | undefined {
  const key = getIndexNowKey();
  if (!key) return undefined;
  return absoluteUrl(`/${key}.txt`);
}

function normalizeIndexNowUrls(urls: string[]): string[] {
  const host = getIndexNowHost();
  const seen = new Set<string>();

  return urls
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .map((url) => {
      try {
        return new URL(url).toString();
      } catch {
        return absoluteUrl(url.startsWith("/") ? url : `/${url}`);
      }
    })
    .filter((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.host !== host && parsed.host !== `www.${host}`) {
          return false;
        }
      } catch {
        return false;
      }
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

/**
 * Notify Bing and other IndexNow engines about new or updated URLs.
 * Requires INDEXNOW_KEY and the matching key file in /public.
 */
export async function submitIndexNowUrls(
  urls: string[],
): Promise<IndexNowSubmitResult> {
  const key = getIndexNowKey();
  const keyLocation = getIndexNowKeyLocation();
  const normalized = normalizeIndexNowUrls(urls);

  if (!key || !keyLocation) {
    return {
      ok: false,
      status: 0,
      submitted: 0,
      message: "INDEXNOW_KEY lipseste.",
    };
  }

  if (normalized.length === 0) {
    return {
      ok: false,
      status: 0,
      submitted: 0,
      message: "Niciun URL valid de trimis.",
    };
  }

  let lastResult: IndexNowSubmitResult = {
    ok: true,
    status: 200,
    submitted: 0,
  };

  for (let offset = 0; offset < normalized.length; offset += MAX_URLS_PER_REQUEST) {
    const chunk = normalized.slice(offset, offset + MAX_URLS_PER_REQUEST);

    try {
      const response = await fetch(INDEXNOW_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          host: getIndexNowHost(),
          key,
          keyLocation,
          urlList: chunk,
        }),
        cache: "no-store",
      });

      lastResult = {
        ok: response.ok,
        status: response.status,
        submitted: chunk.length,
        message: response.ok
          ? undefined
          : `IndexNow a returnat ${response.status}.`,
      };

      if (!response.ok) {
        console.warn("[indexnow] submit failed", {
          status: response.status,
          count: chunk.length,
        });
        return lastResult;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "IndexNow request failed.";
      console.warn("[indexnow] submit error", message);
      return {
        ok: false,
        status: 0,
        submitted: 0,
        message,
      };
    }
  }

  return lastResult;
}

/** Fire-and-forget IndexNow submission for server actions and imports. */
export function scheduleIndexNowUrls(urls: string[]): void {
  void submitIndexNowUrls(urls).then((result) => {
    if (result.ok && result.submitted > 0) {
      console.info(`[indexnow] submitted ${result.submitted} url(s)`);
    }
  });
}

export function scheduleIndexNowPaths(paths: string[]): void {
  scheduleIndexNowUrls(
    paths.map((path) => absoluteUrl(path.startsWith("/") ? path : `/${path}`)),
  );
}

export interface IndexNowWineContext {
  winerySlug?: string | null;
  regionSlug?: string | null;
  grapeSlugs?: string[];
  dishSlugs?: string[];
}

/**
 * Notify Bing/Yandex about a wine change and every programmatic hub page
 * whose content depends on it (winery, region, grape variety, dish pairing).
 */
export function scheduleIndexNowWine(
  slug: string,
  context?: string | null | IndexNowWineContext,
): void {
  const {
    winerySlug = null,
    regionSlug = null,
    grapeSlugs = [],
    dishSlugs = [],
  } = typeof context === "object" && context !== null
    ? context
    : { winerySlug: context };

  const paths = [`/wines/${slug}`, "/vinuri", "/sitemap.xml"];
  if (winerySlug) paths.push(`/wineries/${winerySlug}`);
  if (regionSlug) paths.push(`/regiuni/${regionSlug}`);
  for (const grapeSlug of grapeSlugs) {
    paths.push(`/soiuri/${grapeSlug}`, `/topuri/cele-mai-bune-${grapeSlug}`);
  }
  for (const dishSlug of dishSlugs) {
    paths.push(`/vin-pentru/${dishSlug}`);
  }
  scheduleIndexNowPaths(paths);
}

export function scheduleIndexNowWinery(slug: string): void {
  scheduleIndexNowPaths([`/wineries/${slug}`, "/crame"]);
}

export function scheduleIndexNowRegion(slug: string): void {
  scheduleIndexNowPaths([`/regiuni/${slug}`, "/regiuni", "/sitemap.xml"]);
}

export function scheduleIndexNowGrapeVariety(slug: string): void {
  scheduleIndexNowPaths([
    "/soiuri",
    `/soiuri/${slug}`,
    `/topuri/cele-mai-bune-${slug}`,
    "/sitemap.xml",
  ]);
}

export function scheduleIndexNowDishPairing(slug: string): void {
  scheduleIndexNowPaths([`/vin-pentru/${slug}`, "/sitemap.xml"]);
}

export function scheduleIndexNowStudy(slug: string): void {
  scheduleIndexNowPaths([`/studii/${slug}`, "/topuri/vinuri-sub-50-lei", "/sitemap.xml"]);
}

export function scheduleIndexNowTopList(slug: string): void {
  scheduleIndexNowPaths([`/topuri/${slug}`, "/topuri", "/sitemap.xml"]);
}

export function scheduleIndexNowWineSlugs(slugs: string[]): void {
  if (slugs.length === 0) return;

  const paths = slugs.flatMap((slug) => [`/wines/${slug}`]);
  paths.push("/vinuri", "/sitemap.xml");
  scheduleIndexNowPaths(paths);
}

export async function submitIndexNowWineSlugs(
  slugs: string[],
): Promise<IndexNowSubmitResult> {
  if (slugs.length === 0) {
    return {
      ok: false,
      status: 0,
      submitted: 0,
      message: "Niciun slug de trimis.",
    };
  }

  const paths = slugs.flatMap((slug) => [`/wines/${slug}`]);
  paths.push("/vinuri", "/sitemap.xml");
  return submitIndexNowUrls(
    paths.map((path) => absoluteUrl(path.startsWith("/") ? path : `/${path}`)),
  );
}
