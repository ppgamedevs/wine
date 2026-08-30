import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SommelierChat } from "@/components/sommelier/sommelier-chat";
import { absoluteUrl } from "@/lib/seo";
import AiSommelierLoading from "./loading";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  decodeSommelierPromptCookie,
  SOMMELIER_PROMPT_COOKIE,
} from "@/lib/sommelier-handoff";

export const revalidate = 3600;

function pageCopy(locale: AppLocale) {
  return locale === "en"
    ? {
        description:
          "Ask VinIntel's AI Sommelier for practical Romanian wine recommendations by food, occasion, gift, or budget in RON.",
        keywords: [
          "AI sommelier",
          "Romanian wine recommendation",
          "wine for sarmale",
          "wine pairing",
        ],
      }
    : {
        description:
          "Chat cu somelierul AI VinIntel: recomandari oneste de vinuri romanesti pentru orice ocazie, mancare, desert sau buget in RON.",
        keywords: [
          "somelier AI",
          "chat vin",
          "recomandare vin",
          "vin pentru cozonac",
          "vin pentru sarmale",
          "vin pentru desert",
          "vin romanesc",
          "asociere vin mancare",
        ],
      };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const copy = pageCopy(locale);
  const canonicalPath = localizedHref(locale, "aiSommelier");
  const url = absoluteUrl(canonicalPath);
  return {
    title: "AI Sommelier",
    description: copy.description,
    keywords: copy.keywords,
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "ro_RO",
      url,
      title: "AI Sommelier | VinIntel",
      description: copy.description,
      siteName: "VinIntel",
    },
    twitter: {
      card: "summary_large_image",
      title: "AI Sommelier | VinIntel",
      description: copy.description,
    },
    alternates: {
      canonical: url,
      languages: {
        ro: absoluteUrl(localizedHref("ro", "aiSommelier")),
        en: absoluteUrl(localizedHref("en", "aiSommelier")),
        "x-default": absoluteUrl(localizedHref("ro", "aiSommelier")),
      },
    },
  };
}

export default async function AiSommelierPage() {
  const locale = (await getLocale()) as AppLocale;
  const copy = pageCopy(locale);
  const url = absoluteUrl(localizedHref(locale, "aiSommelier"));
  const handoffCookie = (await cookies()).get(SOMMELIER_PROMPT_COOKIE)?.value;
  const initialPrompt = decodeSommelierPromptCookie(handoffCookie);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VinIntel AI Sommelier",
    url,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: locale === "en" ? "en" : "ro-RO",
    description: copy.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RON",
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<AiSommelierLoading />}>
          <SommelierChat locale={locale} initialPrompt={initialPrompt} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
