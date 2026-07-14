import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
