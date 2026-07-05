import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      { protocol: "https", hostname: "www.cramele-recas.ro" },
      { protocol: "https", hostname: "cramele-recas.ro" },
      { protocol: "https", hostname: "www.cotnari.ro" },
      { protocol: "https", hostname: "www.avincis.ro" },
      { protocol: "https", hostname: "www.liliac.ro" },
      { protocol: "https", hostname: "www.budureasca.ro" },
      { protocol: "https", hostname: "www.lacertawinery.ro" },
      { protocol: "https", hostname: "www.jidvei.ro" },
      { protocol: "https", hostname: "**.emag.ro" },
      { protocol: "https", hostname: "emag.ro" },
    ],
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
