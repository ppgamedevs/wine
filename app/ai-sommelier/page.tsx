import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SommelierForm } from "@/components/sommelier/sommelier-form";
import { getAllWineries, getWinesForSommelier } from "@/lib/queries";

export const revalidate = 3600;

const url = "https://vinintel.ro/ai-sommelier";
const description =
  "Somelierul AI VinIntel iti recomanda vinul romanesc potrivit in functie de buget in RON, ocazie, preferinte si crame favorite. Rapid, clar si hiper-local.";

export const metadata: Metadata = {
  title: "AI Sommelier",
  description,
  keywords: [
    "somelier AI",
    "recomandare vin",
    "vin pentru sarmale",
    "vin cadou",
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

export default async function AiSommelierPage() {
  const [wineries, wines] = await Promise.all([
    getAllWineries(),
    getWinesForSommelier(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60 bg-secondary/20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute left-1/2 top-[-10rem] h-80 w-[40rem] -translate-x-1/2 rounded-full bg-wine/10 blur-3xl" />
          </div>
          <div className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/20 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Somelier AI hiper-local
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Gaseste vinul perfect pentru orice ocazie
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
              Spune-ne bugetul, ocazia si preferintele tale. Primesti instant
              recomandari clare, cu explicatii oneste si preturi in RON.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <SommelierForm wineries={wineries} wines={wines} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
