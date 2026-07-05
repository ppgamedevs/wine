const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 VinIntelBot/1.0";

const MAX_REDIRECT_HOPS = 10;

const FETCH_INIT: RequestInit = {
  headers: {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent": USER_AGENT,
  },
  signal: AbortSignal.timeout(18_000),
};

export interface FetchPageResult {
  html: string;
  /** URL used for extraction after HTTP/HTML redirects. */
  finalUrl: string;
  /** Original request URL. */
  sourceUrl: string;
  redirectChain: string[];
}

export function isProfitshareUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("profitshare.ro");
  } catch {
    return url.toLowerCase().includes("profitshare.ro");
  }
}

function normalizeRedirectTarget(raw: string, baseUrl: string): string | null {
  const trimmed = raw.trim().replace(/&amp;/g, "&");
  if (!trimmed || trimmed.startsWith("javascript:")) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractHtmlRedirectTarget(html: string, baseUrl: string): string | null {
  const metaRefresh = html.match(
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"';]+)/i,
  );
  if (metaRefresh?.[1]) {
    const resolved = normalizeRedirectTarget(metaRefresh[1], baseUrl);
    if (resolved) return resolved;
  }

  const jsRedirect = html.match(
    /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
  );
  if (jsRedirect?.[1]) {
    const resolved = normalizeRedirectTarget(jsRedirect[1], baseUrl);
    if (resolved) return resolved;
  }

  const jsReplaceRedirect = html.match(
    /window\.location\.replace\(\s*["']([^"']+)["']\s*\)/i,
  );
  if (jsReplaceRedirect?.[1]) {
    const resolved = normalizeRedirectTarget(jsReplaceRedirect[1], baseUrl);
    if (resolved) return resolved;
  }

  const profitshareAdblockRedirect = html.match(
    /window\.location\.replace\(\s*["']([^"']+)["']\s*\+\s*e\s*\+\s*["']([^"']*)["']\s*\+\s*isTpBlock/i,
  );
  if (profitshareAdblockRedirect?.[1]) {
    const target = `${profitshareAdblockRedirect[1]}0${profitshareAdblockRedirect[2] ?? ""}-1`;
    const resolved = normalizeRedirectTarget(target, baseUrl);
    if (resolved) return resolved;
  }

  const profitshareSetupRedirect = html.match(
    /Profitshare\.setup\([\s\S]*?,\s*["'](https?:\/\/[^"']+)["']\s*\)/i,
  );
  if (profitshareSetupRedirect?.[1]) {
    const resolved = normalizeRedirectTarget(profitshareSetupRedirect[1], baseUrl);
    if (resolved) return resolved;
  }

  const retailerLink = html.match(
    /<a[^>]+href=["'](https?:\/\/(?:www\.)?(?:emag|altex|flanco|evomag)\.[^"']+)["']/i,
  );
  if (retailerLink?.[1]) {
    const resolved = normalizeRedirectTarget(retailerLink[1], baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

async function fetchRetailerDocument(url: string): Promise<{
  html: string;
  finalUrl: string;
}> {
  const response = await fetch(url, {
    ...FETCH_INIT,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Pagina nu a putut fi accesata (${response.status}).`);
  }

  return {
    html: await response.text(),
    finalUrl: response.url || url,
  };
}

async function resolveProfitshareUrl(
  sourceUrl: string,
): Promise<FetchPageResult> {
  let currentUrl = sourceUrl;
  const redirectChain = [sourceUrl];

  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop += 1) {
    const response = await fetch(currentUrl, {
      ...FETCH_INIT,
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect Profitshare fara Location header.");
      }

      currentUrl = normalizeRedirectTarget(location, currentUrl) ?? currentUrl;
      redirectChain.push(currentUrl);

      if (!isProfitshareUrl(currentUrl)) {
        const retailer = await fetchRetailerDocument(currentUrl);
        if (retailer.finalUrl !== currentUrl) {
          redirectChain.push(retailer.finalUrl);
        }
        return {
          html: retailer.html,
          finalUrl: retailer.finalUrl,
          sourceUrl,
          redirectChain,
        };
      }

      continue;
    }

    if (!response.ok) {
      throw new Error(`Pagina nu a putut fi accesata (${response.status}).`);
    }

    const html = await response.text();
    const htmlTarget = extractHtmlRedirectTarget(html, currentUrl);

    if (htmlTarget && htmlTarget !== currentUrl) {
      currentUrl = htmlTarget;
      redirectChain.push(currentUrl);

      if (isProfitshareUrl(currentUrl)) {
        continue;
      }

      const retailer = await fetchRetailerDocument(currentUrl);
      if (retailer.finalUrl !== currentUrl) {
        redirectChain.push(retailer.finalUrl);
      }
      return {
        html: retailer.html,
        finalUrl: retailer.finalUrl,
        sourceUrl,
        redirectChain,
      };
    }

    throw new Error("Linkul Profitshare nu a putut fi rezolvat catre retailer.");
  }

  throw new Error("Prea multe redirect-uri Profitshare.");
}

export async function fetchPageWithResolution(
  sourceUrl: string,
): Promise<FetchPageResult> {
  if (isProfitshareUrl(sourceUrl)) {
    return resolveProfitshareUrl(sourceUrl);
  }

  const response = await fetch(sourceUrl, {
    ...FETCH_INIT,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Pagina nu a putut fi accesata (${response.status}).`);
  }

  const finalUrl = response.url || sourceUrl;
  const redirectChain =
    finalUrl !== sourceUrl ? [sourceUrl, finalUrl] : [sourceUrl];

  return {
    html: await response.text(),
    finalUrl,
    sourceUrl,
    redirectChain,
  };
}

export async function fetchPageHtml(url: string): Promise<string> {
  const result = await fetchPageWithResolution(url);
  return result.html;
}
