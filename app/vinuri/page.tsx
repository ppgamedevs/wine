import type { Metadata } from "next";
import { Wine } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCatalogDirectory } from "@/components/wines/wine-catalog-directory";
import { Button } from "@/components/ui/button";
import { buildPublicWineCatalogItem } from "@/lib/public-wine-card";
import { getCatalogWines } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/vinuri";

export const metadata: Metadata = {
  title: "Vinuri romanesti: catalog, preturi si scoruri",
  description:
    "Catalog complet de vinuri romanesti cu Value Score, preturi in RON, crama si regiune. Cauta rapid si compara raportul calitate-pret.",
  keywords: [
    "vinuri romanesti",
    "catalog vinuri",
    "Value Score",
    "vin rosu romanesc",
    "vin alb romanesc",
  ],
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Vinuri romanesti: catalog, preturi si scoruri | VinIntel",
    description:
      "Toate vinurile romanesti din catalogul VinIntel, ordonate dupa Value Score.",
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: "Vinuri romanesti: catalog, preturi si scoruri | VinIntel",
    description:
      "Toate vinurile romanesti din catalogul VinIntel, ordonate dupa Value Score.",
  },
};

const faq = [
  {
    question: "Ce este Value Score?",
    answer:
      "Value Score este scorul VinIntel pentru raportul calitate-pret. Cu cat e mai mare, cu atat vinul ofera mai mult pentru banii tai.",
  },
  {
    question: "Cum caut un vin in catalog?",
    answer:
      "Filtreaza dupa culoare sau tip, dulceata, pret si Value Score. Poti cauta si dupa nume, crama, regiune sau soi.",
  },
  {
    question: "Pot adauga un vin care lipseste?",
    answer:
      "Da. Trimite linkul paginii vinului prin formularul Adauga vin si il verificam inainte de publicare.",
  },
];

export default async function VinuriCatalogPage() {
  const catalogWines = await getCatalogWines();
  const publicCatalog = catalogWines.map(buildPublicWineCatalogItem);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Vinuri", path: PATH },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Catalog vinuri romanesti VinIntel",
    numberOfItems: catalogWines.length,
    itemListElement: catalogWines.slice(0, 50).map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/wines/${wine.slug}`),
      name: wine.name,
    })),
  };

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="vinuri"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-[#faf6f0] via-background to-background">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-wine/5 blur-3xl"
          />
          <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
                <Wine className="h-4 w-4" aria-hidden="true" />
                {catalogWines.length} vinuri verificate
              </span>
              <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Vinuri romanesti
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Exploreaza vinurile romanesti dupa culoare, dulceata si buget,
                apoi compara-le dupa Value Score.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="border-wine/30 text-wine hover:bg-wine/10 hover:text-wine"
                >
                  <Link href="/topuri">Topuri populare</Link>
                </Button>
                <Button
                  asChild
                  className="bg-wine text-wine-foreground hover:bg-wine/90"
                >
                  <Link href="/adauga-vin">Adauga un vin</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">
          {catalogWines.length > 0 ? (
            <WineCatalogDirectory wines={publicCatalog} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/20 p-12 text-center text-muted-foreground">
              Inca nu avem vinuri in catalog. Revino in curand sau{" "}
              <Link href="/adauga-vin" className="font-medium text-wine hover:underline">
                trimite primul vin
              </Link>
              .
            </p>
          )}
        </div>

        <section
          aria-labelledby="vinuri-faq-heading"
          className="border-t border-border/60 bg-secondary/20 py-14"
        >
          <div className="mx-auto max-w-3xl px-6">
            <h2
              id="vinuri-faq-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Intrebari frecvente
            </h2>
            <dl className="mt-8 space-y-6">
              {faq.map((item) => (
                <div key={item.question}>
                  <dt className="font-medium text-foreground">{item.question}</dt>
                  <dd className="mt-2 text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
