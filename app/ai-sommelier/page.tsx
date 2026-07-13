import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SommelierChat } from "@/components/sommelier/sommelier-chat";
import { absoluteUrl } from "@/lib/seo";
import AiSommelierLoading from "./loading";

export const revalidate = 3600;

const url = absoluteUrl("/ai-sommelier");
const description =
  "Chat cu somelierul AI VinIntel: recomandari oneste de vinuri romanesti pentru orice ocazie, mancare, desert sau buget in RON.";

export const metadata: Metadata = {
  title: "AI Sommelier",
  description,
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
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url,
    title: "AI Sommelier | VinIntel",
    description,
    siteName: "VinIntel",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sommelier | VinIntel",
    description,
  },
  alternates: { canonical: url },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "VinIntel AI Sommelier",
  url,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  inLanguage: "ro-RO",
  description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RON",
  },
};

export default function AiSommelierPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<AiSommelierLoading />}>
          <SommelierChat />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
