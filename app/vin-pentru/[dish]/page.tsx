import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCard } from "@/components/wine-card";
import {
  buildDishFaq,
  getAllDishPairingSlugs,
  getDishPairingPage,
  rankWinesForDish,
} from "@/lib/dish-pairing-pages";
import { getWinesForSommelier } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";
import { MIN_INDEXABLE_TOP_LIST_WINES } from "@/lib/top-lists";

export const revalidate = 3600;
export const dynamicParams = false;

interface VinPentruPageProps {
  params: Promise<{ dish: string }>;
}

export async function generateStaticParams() {
  const allWines = await getWinesForSommelier();
  return getAllDishPairingSlugs()
    .filter((slug) => {
      const config = getDishPairingPage(slug);
      if (!config) return false;
      return rankWinesForDish(allWines, config).length >= MIN_INDEXABLE_TOP_LIST_WINES;
    })
    .map((dish) => ({ dish }));
}

export async function generateMetadata({ params }: VinPentruPageProps): Promise<Metadata> {
  const { dish } = await params;
  const config = getDishPairingPage(dish);
  if (!config) return { title: "Pagina negasita" };

  const url = absoluteUrl(`/vin-pentru/${dish}`);
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title: `${config.metaTitle} | VinIntel`,
      description: config.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: `${config.metaTitle} | VinIntel`,
      description: config.metaDescription,
    },
  };
}

export default async function VinPentruPage({ params }: VinPentruPageProps) {
  const { dish } = await params;
  const config = getDishPairingPage(dish);
  if (!config) notFound();

  const allWines = await getWinesForSommelier();
  const wines = rankWinesForDish(allWines, config);

  if (wines.length < MIN_INDEXABLE_TOP_LIST_WINES) notFound();

  const faq = buildDishFaq(config, wines);
  const url = absoluteUrl(`/vin-pentru/${dish}`);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: config.heading,
    url,
    numberOfItems: wines.length,
    itemListElement: wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/wines/${wine.slug}`),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Vinuri", path: "/vinuri" },
    { name: config.dishName, path: `/vin-pentru/${dish}` },
  ]);

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="vin-pentru"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:py-14">
            <nav
              aria-label="Breadcrumb"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Link href="/" className="hover:text-wine">
                Acasa
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{config.dishName}</span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {config.heading}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {config.intro}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <section aria-labelledby="wines-heading">
            <h2
              id="wines-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              Recomandari VinIntel
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {wines.map((wine) => (
                <WineCard key={wine.id} wine={wine} minValueScore={null} />
              ))}
            </div>
          </section>

          <section aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              Intrebari frecvente
            </h2>
            <div className="mt-6 space-y-3">
              {faq.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
                >
                  <h3 className="font-medium text-foreground">{item.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
