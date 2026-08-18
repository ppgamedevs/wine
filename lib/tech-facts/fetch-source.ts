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

export type SourceFetchFailureClass =
  | "DEAD_404"
  | "FETCH_BLOCKED"
  | "SERVER_ERROR"
  | "TEMP_ERROR"
  | "INVALID_CONTENT_TYPE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "REJECTED_URL";

export interface FetchedSource {
  url: string;
  finalUrl: string;
  httpStatus: number;
  text: string;
  html?: string;
  isPdf: boolean;
  title?: string;
  redirected: boolean;
  contentType: string;
  discoveredUrls?: string[];
}

export interface SourceFetchAttempt {
  url: string;
  ok: boolean;
  httpStatus: number | null;
  contentType: string;
  redirected: boolean;
  finalUrl: string | null;
  failureClass: SourceFetchFailureClass | null;
  reason: string | null;
}

export interface SourceProbeObservation {
  url: string;
  method: "GET" | "HEAD";
  ok: boolean;
  httpStatus: number | null;
  contentType: string;
  finalUrl: string | null;
  redirected: boolean;
  failureClass: SourceFetchFailureClass | null;
  reason: string | null;
  elapsedMs: number;
  responseHeaders: {
    server: string | null;
    retryAfter: string | null;
    cacheStatus: string | null;
    requestId: string | null;
  };
  body: string | null;
}

interface FetchOutcome {
  source: FetchedSource | null;
  attempt: SourceFetchAttempt;
}

const cache = new Map<string, FetchOutcome>();

function looksLikePdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

export function classifyHttpFailure(status: number): SourceFetchFailureClass {
  if (status === 404 || status === 410) return "DEAD_404";
  if (status === 401 || status === 403) return "FETCH_BLOCKED";
  if (status === 408 || status === 425 || status === 429) return "TEMP_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "NETWORK_ERROR";
}

export async function probeOfficialSource(input: {
  url: string;
  method?: "GET" | "HEAD";
  browserAccept?: boolean;
  timeoutMs?: number;
}): Promise<SourceProbeObservation> {
  const method = input.method ?? "GET";
  const started = Date.now();
  try {
    const response = await fetch(input.url, {
      method,
      headers: input.browserAccept === false
        ? { "User-Agent": USER_AGENT }
        : {
            Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
            "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7",
            "Cache-Control": "no-cache",
            "User-Agent": USER_AGENT,
          },
      redirect: "follow",
      signal: AbortSignal.timeout(input.timeoutMs ?? FETCH_TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const ok = response.ok && isSupportedContentType(contentType, response.url);
    const failureClass = response.ok
      ? ok
        ? null
        : "INVALID_CONTENT_TYPE"
      : classifyHttpFailure(response.status);
    return {
      url: input.url,
      method,
      ok,
      httpStatus: response.status,
      contentType,
      finalUrl: response.url,
      redirected: response.redirected || response.url !== input.url,
      failureClass,
      reason: ok
        ? null
        : response.ok
          ? `Unsupported content type: ${contentType || "missing"}`
          : `HTTP ${response.status}`,
      elapsedMs: Date.now() - started,
      responseHeaders: {
        server: response.headers.get("server"),
        retryAfter: response.headers.get("retry-after"),
        cacheStatus:
          response.headers.get("cf-cache-status") ??
          response.headers.get("x-cache") ??
          response.headers.get("x-cache-status"),
        requestId:
          response.headers.get("cf-ray") ??
          response.headers.get("x-request-id") ??
          response.headers.get("x-amzn-requestid"),
      },
      body: method === "GET" && response.ok
        ? (await response.text()).slice(0, 2_000_000)
        : null,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      url: input.url,
      method,
      ok: false,
      httpStatus: null,
      contentType: "",
      finalUrl: null,
      redirected: false,
      failureClass: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      reason: error instanceof Error ? error.message : "Unknown network error",
      elapsedMs: Date.now() - started,
      responseHeaders: {
        server: null,
        retryAfter: null,
        cacheStatus: null,
        requestId: null,
      },
      body: null,
    };
  }
}

export async function probeOfficialSourceRepeated(input: {
  url: string;
  attempts?: number;
  spacingMs?: number;
}): Promise<SourceProbeObservation[]> {
  const observations: SourceProbeObservation[] = [];
  const attempts = Math.max(1, Math.min(input.attempts ?? 3, 3));
  const spacingMs = Math.max(250, input.spacingMs ?? 750);
  for (let index = 0; index < attempts; index += 1) {
    observations.push(
      await probeOfficialSource({
        url: input.url,
        method: "GET",
        browserAccept: true,
      }),
    );
    if (index + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, spacingMs));
    }
  }
  return observations;
}

function isSupportedContentType(contentType: string, url: string): boolean {
  if (!contentType) return true;
  if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml")) return true;
  if (contentType.includes("application/pdf") || contentType.includes("application/octet-stream")) return true;
  return looksLikePdfUrl(url) && contentType.includes("binary");
}

function failedAttempt(
  url: string,
  input: Partial<Omit<SourceFetchAttempt, "url" | "ok">>,
): FetchOutcome {
  return {
    source: null,
    attempt: {
      url,
      ok: false,
      httpStatus: input.httpStatus ?? null,
      contentType: input.contentType ?? "",
      redirected: input.redirected ?? false,
      finalUrl: input.finalUrl ?? null,
      failureClass: input.failureClass ?? "NETWORK_ERROR",
      reason: input.reason ?? null,
    },
  };
}

async function fetchOne(url: string): Promise<FetchOutcome> {
  if (isRejectedTechnicalDocumentUrl(url)) {
    const rejected = failedAttempt(url, {
      failureClass: "REJECTED_URL",
      reason: "URL matched the technical-document denylist",
    });
    cache.set(url, rejected);
    return rejected;
  }
  const cached = cache.get(url);
  if (cached) return cached;

  const maxAttempts = 2;
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
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
      const failureClass = classifyHttpFailure(response.status);
      if (
        attemptNumber < maxAttempts &&
        (failureClass === "TEMP_ERROR" || failureClass === "SERVER_ERROR")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      const failed = failedAttempt(url, {
        httpStatus: response.status,
        contentType,
        redirected,
        finalUrl: response.url,
        failureClass,
        reason: `HTTP ${response.status}`,
      });
      cache.set(url, failed);
      return failed;
    }
    if (!isSupportedContentType(contentType, response.url)) {
      const failed = failedAttempt(url, {
        httpStatus: response.status,
        contentType,
        redirected,
        finalUrl: response.url,
        failureClass: "INVALID_CONTENT_TYPE",
        reason: `Unsupported content type: ${contentType || "missing"}`,
      });
      cache.set(url, failed);
      return failed;
    }
    const isPdf =
      looksLikePdfUrl(url) ||
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream");
    if (isPdf) {
      if (contentType.includes("text/html")) {
        const failed = failedAttempt(url, {
          httpStatus: response.status,
          contentType,
          redirected,
          finalUrl: response.url,
          failureClass: "INVALID_CONTENT_TYPE",
          reason: "PDF URL returned HTML",
        });
        cache.set(url, failed);
        return failed;
      }
      const text = await extractPdfTextFromUrl(response.url);
      const fetched: FetchedSource = {
        url,
        finalUrl: response.url,
        httpStatus: response.status,
        text,
        isPdf: true,
        title: url.split("/").pop(),
        redirected,
        contentType,
      };
      const outcome: FetchOutcome = {
        source: fetched,
        attempt: {
          url,
          ok: true,
          httpStatus: response.status,
          contentType,
          redirected,
          finalUrl: response.url,
          failureClass: null,
          reason: null,
        },
      };
      cache.set(url, outcome);
      return outcome;
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
      finalUrl: response.url,
      httpStatus: response.status,
      text: stripHtml(html).slice(0, 14_000),
      html: html.slice(0, 2_000_000),
      isPdf: false,
      title,
      redirected,
      contentType,
      discoveredUrls: discovered.slice(0, 3),
    };
    const outcome: FetchOutcome = {
      source: fetched,
      attempt: {
        url,
        ok: true,
        httpStatus: response.status,
        contentType,
        redirected,
        finalUrl: response.url,
        failureClass: null,
        reason: null,
      },
    };
    cache.set(url, outcome);
    return outcome;
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      if (attemptNumber < maxAttempts && isTimeout) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      const failed = failedAttempt(url, {
        failureClass: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        reason: error instanceof Error ? error.message : "Unknown network error",
      });
      cache.set(url, failed);
      return failed;
    }
  }
  const failed = failedAttempt(url, { reason: "Fetch attempts exhausted" });
  cache.set(url, failed);
  return failed;
}

export async function fetchOfficialSources(
  urls: string[],
): Promise<{ sources: FetchedSource[]; attempts: SourceFetchAttempt[]; stats: FetchStats }> {
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
  const attempts: SourceFetchAttempt[] = [];

  async function runBatch(batch: string[]) {
    let index = 0;
    async function worker() {
      while (index < batch.length) {
        const current = batch[index];
        index += 1;
        if (!current) continue;
        const cached = cache.has(current);
        if (cached) stats.cached += 1;
        const outcome = await fetchOne(current);
        attempts.push(outcome.attempt);
        if (!outcome.source) {
          stats.failed += 1;
          if (
            looksLikePdfUrl(current) &&
            outcome.attempt.failureClass === "INVALID_CONTENT_TYPE"
          ) {
            stats.htmlInsteadOfPdf += 1;
          }
          continue;
        }
        stats.ok += 1;
        if (outcome.source.redirected) stats.redirected += 1;
        sources.push(outcome.source);
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

  return { sources, attempts, stats };
}

export function resetFetchCache(): void {
  cache.clear();
}
