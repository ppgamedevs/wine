/**
 * Bounded official-source fetch for dry-run recovery. Never logs secrets.
 */
import { extractPdfTextFromUrl } from "@/lib/pdf-text";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import { isRejectedTechnicalDocumentUrl } from "@/lib/tech-facts/pdf-classify";
import type { FetchStats } from "@/lib/tech-facts/recover";
import { discoverOfficialDocumentUrls } from "@/lib/tech-facts/source-identity";
import { classifySourceUrl, isOfficialProducerSource } from "@/lib/source-trust";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_CONCURRENCY = 2;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 VinIntelBot/1.0";

export interface FetchedSource {
  url: string;
  text: string;
  html?: string;
  isPdf: boolean;
  title?: string;
  redirected: boolean;
  contentType: string;
  discoveredUrls?: string[];
}

const cache = new Map<string, FetchedSource | null>();

function looksLikePdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

async function fetchOne(url: string): Promise<FetchedSource | null> {
  if (isRejectedTechnicalDocumentUrl(url)) {
    cache.set(url, null);
    return null;
  }
  if (cache.has(url)) return cache.get(url) ?? null;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/pdf,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const redirected = response.redirected || response.url !== url;
    if (!response.ok) {
      cache.set(url, null);
      return null;
    }
    const isPdf =
      looksLikePdfUrl(url) ||
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream");
    if (isPdf) {
      if (contentType.includes("text/html")) {
        cache.set(url, null);
        return null;
      }
      const text = await extractPdfTextFromUrl(url);
      const fetched: FetchedSource = {
        url,
        text,
        isPdf: true,
        title: url.split("/").pop(),
        redirected,
        contentType,
      };
      cache.set(url, fetched);
      return fetched;
    }
    const html = await response.text();
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const discovered = discoverOfficialDocumentUrls(html, url).filter((item) => {
      if (isRejectedTechnicalDocumentUrl(item)) return false;
      const type = classifySourceUrl(item, { isPdf: looksLikePdfUrl(item) });
      return isOfficialProducerSource(type) || type === "producer_general";
    });
    const fetched: FetchedSource = {
      url,
      text: stripHtml(html).slice(0, 14_000),
      html: html.slice(0, 400_000),
      isPdf: false,
      title,
      redirected,
      contentType,
      discoveredUrls: discovered.slice(0, 3),
    };
    cache.set(url, fetched);
    return fetched;
  } catch {
    cache.set(url, null);
    return null;
  }
}

export async function fetchOfficialSources(
  urls: string[],
): Promise<{ sources: FetchedSource[]; stats: FetchStats }> {
  const unique = [...new Set(urls.filter((url) => !isRejectedTechnicalDocumentUrl(url)))];
  const stats: FetchStats = {
    attempted: unique.length,
    ok: 0,
    failed: 0,
    redirected: 0,
    htmlInsteadOfPdf: 0,
    cached: 0,
  };
  const sources: FetchedSource[] = [];

  async function runBatch(batch: string[]) {
    let index = 0;
    async function worker() {
      while (index < batch.length) {
        const current = batch[index];
        index += 1;
        if (!current) continue;
        const cached = cache.has(current);
        if (cached) stats.cached += 1;
        const result = await fetchOne(current);
        if (!result) {
          stats.failed += 1;
          if (looksLikePdfUrl(current)) stats.htmlInsteadOfPdf += 1;
          continue;
        }
        stats.ok += 1;
        if (result.redirected) stats.redirected += 1;
        sources.push(result);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, batch.length || 1) }, () => worker()),
    );
  }

  await runBatch(unique);
  const extras = [...new Set(sources.flatMap((source) => source.discoveredUrls ?? []))]
    .filter((url) => !cache.has(url))
    .slice(0, 80);
  stats.attempted += extras.length;
  await runBatch(extras);

  return { sources, stats };
}

export function resetFetchCache(): void {
  cache.clear();
}
