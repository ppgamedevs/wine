import type { Metadata } from "next";
import { Award } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TopListGrid } from "@/components/top-list-grid";
import { Button } from "@/components/ui/button";
import {
  TOP_LIST_INDEX_LINKS,
  topListHref,
} from "@/lib/top-list-links";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/topuri";

export const metadata: Metadata = {
  title: "Topuri vinuri romanesti",
  description:
    "Topuri VinIntel: vinuri sub 50 lei, pentru sarmale, Feteasca Neagra, cadou si alte selectii populare dupa Value Score.",
  keywords: [
    "top vinuri romanesti",
    "vinuri sub 50 lei",
    "vin pentru sarmale",
    "feteasca neagra",
    "vin cadou",
  ],
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Topuri vinuri romanesti | VinIntel",
    description:
      "Cele mai cautate topuri de vinuri romanesti: buget, ocazie, soi si cadou.",
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: "Topuri vinuri romanesti | VinIntel",
    description:
      "Cele mai cautate topuri de vinuri romanesti: buget, ocazie, soi si cadou.",
  },
};

const faq = [
  {
    question: "Cum sunt construite topurile VinIntel?",
    answer:
      "Topurile combina Value Score, pret, tip de vin, ocazie si soiuri din catalogul nostru verificat. Lista se actualizeaza pe masura ce adaugam vinuri noi.",
  },
  {
    question: "Ce inseamna vinuri sub 50 lei?",
    answer:
      "Selectii cu pret mediu sub 50 RON, ordonate dupa raportul calitate-pret. Ideal pentru cump cumparaturi zilnice sau mese cu prietenii.",
  },
  {
    question: "Pot sugera un top nou?",
    answer:
      "Da. Trimite-ne un mesaj sau foloseste Adauga vin daca lipseste un vin pe care il cauti in topuri.",
  },
];

export default function TopuriIndexPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Topuri", path: PATH },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Topuri vinuri romanesti VinIntel",
    numberOfItems: TOP_LIST_INDEX_LINKS.length,
    itemListElement: TOP_LIST_INDEX_LINKS.map((link, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(topListHref(link.slug)),
      name: link.title,
    })),
  };

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="topuri"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Award className="h-4 w-4" aria-hidden="true" />
              {TOP_LIST_INDEX_LINKS.length} topuri
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Topuri vinuri romanesti
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Selectii populare dupa buget, ocazie si soi. Alege rapid vinul
              potrivit fara sa parcurgi tot catalogul.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 border-wine/30 text-wine hover:bg-wine/10 hover:text-wine"
            >
              <Link href="/vinuri">Vezi tot catalogul</Link>
            </Button>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12">
          <TopListGrid />
        </div>

        <section
          aria-labelledby="topuri-faq-heading"
          className="border-t border-border/60 bg-secondary/20 py-14"
        >
          <div className="mx-auto max-w-3xl px-6">
            <h2
              id="topuri-faq-heading"
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
