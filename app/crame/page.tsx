import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineryDirectory } from "@/components/wineries/winery-directory";
import { getWineriesIndex } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/crame";

export const metadata: Metadata = {
  title: "Crame romanesti",
  description:
    "Descopera cramele romanesti de pe VinIntel: regiune, numar de vinuri, Value Score mediu si interval de pret. Gaseste producatorul potrivit pentru gustul tau.",
  keywords: ["crame romanesti", "producatori vin", "vinarii", "vinuri romanesti"],
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Crame romanesti | VinIntel",
    description:
      "Toate cramele romanesti intr-un singur loc: regiune, vinuri, scoruri si preturi.",
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: "Crame romanesti | VinIntel",
    description:
      "Toate cramele romanesti intr-un singur loc: regiune, vinuri, scoruri si preturi.",
  },
};

export default async function WineriesIndexPage() {
  const wineries = await getWineriesIndex();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Crame", path: PATH },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Crame romanesti",
    numberOfItems: wineries.length,
    itemListElement: wineries.map((winery, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/wineries/${winery.slug}`),
      name: winery.name,
    })),
  };

  return (
    <>
      <JsonLd data={[itemListJsonLd, breadcrumbJsonLd]} id="crame" />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {wineries.length} crame
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Crame romanesti
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Exploreaza producatorii de vin din Romania. Vezi regiunea, numarul
              de vinuri, Value Score-ul mediu si intervalul de pret pentru fiecare
              crama.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12">
          {wineries.length > 0 ? (
            <WineryDirectory wineries={wineries} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/20 p-12 text-center text-muted-foreground">
              Inca nu avem crame listate. Revino in curand.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
