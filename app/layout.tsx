import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsentRoot } from "@/components/cookie-consent/cookie-consent-root";
import { JsonLd } from "@/components/json-ld";
import { DEFAULT_LOCALE, isAppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { localizedRobots } from "@/lib/i18n/indexing";
import {
  absoluteUrl,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  SITE,
} from "@/lib/seo";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestedLocale = await getLocale();
  const locale = isAppLocale(requestedLocale)
    ? requestedLocale
    : DEFAULT_LOCALE;
  const isEnglish = locale === "en";
  const description = isEnglish
    ? "An independent guide to Romanian wines with prices in RON, transparent scores and an AI Sommelier."
    : SITE.description;
  const socialTitle = isEnglish
    ? "VinIntel: Romanian wine, clearly explained"
    : "VinIntel: Vinuri romanesti. Clar. Onest. Rapid.";
  const homeUrl = absoluteUrl(localizedHref(locale, "home"));
  const robots = localizedRobots(locale);

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: isEnglish
        ? "VinIntel: Romanian wine guide, prices and recommendations"
        : "VinIntel: Ghid de vinuri romanesti, preturi si recomandari",
      template: "%s | VinIntel",
    },
    description,
    applicationName: SITE.name,
    keywords: isEnglish
      ? [
          "Romanian wines",
          "Romanian wine guide",
          "AI Sommelier",
          "wine recommendations",
          "Romanian wineries",
          "wine and food pairing",
        ]
      : [
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
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: {
      type: "website",
      locale: isEnglish ? "en_GB" : SITE.locale,
      url: homeUrl,
      siteName: SITE.name,
      title: socialTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      creator: SITE.twitter,
      title: socialTitle,
      description,
    },
    robots: {
      ...robots,
      googleBot: {
        ...robots,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...(googleSiteVerification
      ? { verification: { google: googleSiteVerification } }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestedLocale = await getLocale();
  const locale = isAppLocale(requestedLocale)
    ? requestedLocale
    : DEFAULT_LOCALE;
  const messages = await getMessages({ locale });
  const clientMessages = {
    Navigation: messages.Navigation,
    Route: messages.Route,
    Error: messages.Error,
    Search: messages.Search,
  };

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd
          data={[
            buildOrganizationJsonLd(locale),
            buildWebsiteJsonLd(locale),
          ]}
          id="site"
        />
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </NextIntlClientProvider>
        <CookieConsentRoot />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
