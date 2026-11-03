/**
 * Image hosts that the Next.js optimizer is allowed to fetch and resize.
 *
 * Single source of truth for both `next.config.ts` (`images.remotePatterns`)
 * and `lib/wine-images.ts` (`unoptimized` decision). Keeping one list prevents
 * the optimizer allowlist and the runtime decision from drifting apart, which
 * used to force full-size retailer images on cards.
 *
 * Only HTTPS hosts belong here. `**` is supported as a subdomain wildcard by
 * Next.js `remotePatterns` and by `isOptimizableImageHost`.
 */
export const IMAGE_REMOTE_HOSTS = [
  "images.unsplash.com",
  "picsum.photos",
  "**.vinintel.ro",
  "**.public.blob.vercel-storage.com",
  // Romanian winery sites (replace with real URLs as crame submit photos)
  "www.davino.ro",
  "davino.ro",
  "www.cramelerecas.ro",
  "cramelerecas.ro",
  "www.avincis.ro",
  "www.budureasca.ro",
  "budureasca.ro",
  "cramagabai.ro",
  "www.cramagabai.ro",
  "murfatlar-vinul.ro",
  "www.murfatlar-vinul.ro",
  "www.lacertawinery.ro",
  "www.jidvei.ro",
  "**.emag.ro",
  "serve.ro",
  "www.serve.ro",
  "cramaoprisor.ro",
  "liliac.com",
  "www.liliac.com",
  "casadevinuricotnari.ro",
  "domeniulcoroanei.ro",
  "tohani.ro",
  "www.tohani.ro",
  "petrovaselo.com",
  "cramagirboiu.ro",
  "cramabasilescu.ro",
  "domeniilesamburesti.ro",
  "www.ballageza.com",
  "corcova.ro",
  "stirbey.com",
  "vinarte.ro",
  "halewood.com.ro",
  "villavinea.com",
  "purcariwineries.com",
] as const;

/** True when `hostname` matches an allowlisted host, including `**.` wildcards. */
export function isOptimizableImageHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;

  return IMAGE_REMOTE_HOSTS.some((pattern) => {
    const candidate = pattern.toLowerCase();
    if (candidate.startsWith("**.")) {
      const suffix = candidate.slice(3);
      return host === suffix || host.endsWith(`.${suffix}`);
    }
    return host === candidate;
  });
}
