import type { Metadata } from "next";
import { Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineryDirectory } from "@/components/wineries/winery-directory";
import { getFeaturedRegions, getWineriesIndex } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/crame";

export const metadata: Metadata = {
  title: "Crame din Romania: regiuni, vinuri si clasamente",
  description:
    "Director de crame romanesti: regiune, numar de vinuri, Value Score mediu, interval de pret si cel mai bun vin al fiecarei crame.",
  keywords: ["crame romanesti", "producatori vin", "vinarii", "vinuri romanesti"],
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Crame din Romania: regiuni, vinuri si clasamente | VinIntel",
    description:
      "Toate cramele romanesti intr-un singur loc: regiune, vinuri, scoruri si preturi.",
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: "Crame din Romania: regiuni, vinuri si clasamente | VinIntel",
    description:
      "Toate cramele romanesti intr-un singur loc: regiune, vinuri, scoruri si preturi.",
  },
};

const faq = [
  {
    question: "Cate crame romanesti sunt pe VinIntel?",
    answer:
      "Listam crame cu cel putin un vin analizat in catalog. Fiecare profil include regiune, numar de vinuri, Value Score mediu si interval de pret.",
  },
  {
    question: "Cum aleg o crama potrivita?",
    answer:
      "Compara Value Score-ul mediu, intervalul de pret si vinurile disponibile. Poti explora si regiunile viticole pentru context local.",
  },
  {
    question: "Pot revendica profilul cramei?",
    answer:
      "Da. Producatorii pot revendica profilul, verifica datele si actualiza informatiile despre vinuri prin formularul Revendica crama.",
  },
];

export default async function WineriesIndexPage() {
  const [wineries, featuredRegions] = await Promise.all([
    getWineriesIndex(),
    getFeaturedRegions(6),
  ]);

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
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="crame"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {wineries.length} crame
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Crame din Romania
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Exploreaza producatorii de vin din Romania. Vezi regiunea, numarul
              de vinuri, Value Score-ul mediu si intervalul de pret pentru fiecare
              crama.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-14 px-6 py-12">
          {featuredRegions.length > 0 ? (
            <section aria-labelledby="regions-heading">
              <h2
                id="regions-heading"
                className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
              >
                Exploreaza pe regiuni
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredRegions.map((region) => (
                  <Link
                    key={region.slug}
                    href={`/regiuni/${region.slug}`}
                    className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:border-wine/30 hover:shadow-sm"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm text-wine">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      Regiune viticola
                    </span>
                    <h3 className="mt-2 font-serif text-lg font-semibold text-foreground group-hover:text-wine">
                      {region.name}
                    </h3>
                    {region.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {region.description}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {wineries.length > 0 ? (
            <WineryDirectory wineries={wineries} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/20 p-12 text-center text-muted-foreground">
              Inca nu avem crame listate. Revino in curand.
            </p>
          )}
        </div>

        <section
          aria-labelledby="crame-faq-heading"
          className="border-t border-border/60 bg-secondary/20 py-14"
        >
          <div className="mx-auto max-w-3xl px-6">
            <h2
              id="crame-faq-heading"
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
