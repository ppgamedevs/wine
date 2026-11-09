import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import createNextIntlPlugin from "next-intl/plugin";
import {
  BOTID_PROXY_SEGMENT,
  withBotIdRewritesBeforeFiles,
} from "./lib/security/botid-proxy";
import { IMAGE_REMOTE_HOSTS } from "./lib/image-hosts";

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
      {
        // Legacy generated slug repeated the "pentru-" prefix for dessert.
        source:
          "/topuri/vinuri-sub-:budget(\\d+)-lei-pentru-pentru-desert",
        destination: "/topuri/vinuri-sub-:budget-lei-pentru-desert",
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
      {
        // Self-hosted LCP font: immutable so the preload and the @font-face
        // request share one cached response instead of revalidating.
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Wine labels are text-heavy; keep a sharper variant alongside the default.
    qualities: [75, 85],
    // Keep the optimizer allowlist in sync with the runtime decision in
    // lib/wine-images.ts through one shared list.
    remotePatterns: IMAGE_REMOTE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  poweredByHeader: false,
  compress: true,
};

export default withBotIdRewritesBeforeFiles(
  withBotId(withNextIntl(nextConfig)),
);
