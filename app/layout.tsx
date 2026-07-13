import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsentRoot } from "@/components/cookie-consent/cookie-consent-root";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd, SITE, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "VinIntel – Ghid de vinuri romanesti, preturi si recomandari",
    template: "%s | VinIntel",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "vinuri romanesti",
    "vin romanesc",
    "somelier AI",
    "recomandari vin",
    "crame din Romania",
    "asociere vin si mancare",
  ],
  authors: [{ name: "VinIntel" }],
  creator: "VinIntel",
  publisher: "VinIntel",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: "VinIntel - Vinuri romanesti. Clar. Onest. Rapid.",
    description:
      "Ghidul inteligent al vinurilor romanesti, cu un somelier AI hiper-local.",
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    creator: SITE.twitter,
    title: "VinIntel - Vinuri romanesti. Clar. Onest. Rapid.",
    description:
      "Ghidul inteligent al vinurilor romanesti, cu un somelier AI hiper-local.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={[organizationJsonLd, websiteJsonLd]} id="site" />
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <CookieConsentRoot />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
