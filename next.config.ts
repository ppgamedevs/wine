import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import createNextIntlPlugin from "next-intl/plugin";
import {
  BOTID_PROXY_SEGMENT,
  withBotIdRewritesBeforeFiles,
} from "./lib/security/botid-proxy";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const contentSecurityPolicy = [
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  ...(process.env.NODE_ENV === "production"
    ? ["upgrade-insecure-requests"]
    : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(self)",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
] as const;

const nextConfig: NextConfig = {
  // Journal metadata is read from Markdown during sitemap ISR regeneration.
  // Explicit tracing keeps those files available in the deployed function.
  outputFileTracingIncludes: {
    "/sitemap.xml": ["./content/journal/**/*.md"],
  },
  async redirects() {
    return [
      {
        source: "/journal/recolta-2024-in-moldova-ce-inseamna-pentru-tine",
        destination:
          "/journal/recolta-2026-in-moldova-ce-inseamna-pentru-tine",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: `/((?!${BOTID_PROXY_SEGMENT}).*)`,
        headers: [...securityHeaders],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "**.vinintel.ro" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      // Romanian winery sites (replace with real URLs as crame submit photos)
      { protocol: "https", hostname: "www.davino.ro" },
      { protocol: "https", hostname: "davino.ro" },
      { protocol: "https", hostname: "www.cramelerecas.ro" },
      { protocol: "https", hostname: "cramelerecas.ro" },
      { protocol: "https", hostname: "www.avincis.ro" },
      { protocol: "https", hostname: "www.budureasca.ro" },
      { protocol: "https", hostname: "budureasca.ro" },
      { protocol: "https", hostname: "cramagabai.ro" },
      { protocol: "https", hostname: "www.cramagabai.ro" },
      { protocol: "https", hostname: "murfatlar-vinul.ro" },
      { protocol: "https", hostname: "www.murfatlar-vinul.ro" },
      { protocol: "https", hostname: "www.lacertawinery.ro" },
      { protocol: "https", hostname: "www.jidvei.ro" },
      { protocol: "https", hostname: "**.emag.ro" },
      { protocol: "https", hostname: "serve.ro" },
      { protocol: "https", hostname: "www.serve.ro" },
      { protocol: "https", hostname: "cramaoprisor.ro" },
      { protocol: "https", hostname: "liliac.com" },
      { protocol: "https", hostname: "www.liliac.com" },
      { protocol: "https", hostname: "casadevinuricotnari.ro" },
      { protocol: "https", hostname: "domeniulcoroanei.ro" },
      { protocol: "https", hostname: "tohani.ro" },
      { protocol: "https", hostname: "www.tohani.ro" },
      { protocol: "https", hostname: "petrovaselo.com" },
      { protocol: "https", hostname: "cramagirboiu.ro" },
      { protocol: "https", hostname: "cramabasilescu.ro" },
      { protocol: "https", hostname: "domeniilesamburesti.ro" },
      { protocol: "https", hostname: "www.ballageza.com" },
      { protocol: "https", hostname: "corcova.ro" },
      { protocol: "https", hostname: "stirbey.com" },
      { protocol: "https", hostname: "vinarte.ro" },
      { protocol: "https", hostname: "halewood.com.ro" },
      { protocol: "https", hostname: "villavinea.com" },
      { protocol: "https", hostname: "purcariwineries.com" },
    ],
  },
  poweredByHeader: false,
  compress: true,
};

export default withBotIdRewritesBeforeFiles(
  withBotId(withNextIntl(nextConfig)),
);
