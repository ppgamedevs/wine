import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCard } from "@/components/wine-card";
import { getGrapeVarietySlugs, getWinesForSommelier } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";
import {
  getTopWinesByValue,
  MIN_INDEXABLE_TOP_LIST_WINES,
} from "@/lib/top-lists";
import type { WineWithRelations } from "@/types";
import { formatRon } from "@/lib/format";

export const revalidate = 3600;
export const dynamicParams = true;

interface SoiuriPageProps {
  params: Promise<{ slug: string }>;
}

function deslugify(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function filterWinesByGrape(
  wines: WineWithRelations[],
  grapeSlug: string,
  grapeName: string,
): WineWithRelations[] {
  return wines.filter((w) =>
    w.grapeVarieties.some(
      (g) =>
        g.slug === grapeSlug ||
        g.name.toLowerCase() === grapeName.toLowerCase(),
    ),
  );
}

function buildGrapeFaq(
  grapeName: string,
  wines: WineWithRelations[],
  topListSlug: string,
): FaqEntry[] {
  const top = wines[0];
  return [
    {
      question: `Care sunt cele mai bune vinuri ${grapeName}?`,
      answer: top
        ? `${top.name} conduce cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
        : `Actualizam topul de vinuri ${grapeName} periodic.`,
    },
    {
      question: `Ce caracteristici are soiul ${grapeName}?`,
      answer: `${grapeName} este un soi reprezentativ in viticultura romaneasca, cu stiluri diferite in functie de regiune si crama.`,
    },
    {
      question: "Unde vad clasamentul complet?",
      answer: `Clasamentul complet de vinuri ${grapeName} este pe vinintel.ro/topuri/${topListSlug}.`,
    },
  ];
}

export async function generateStaticParams() {
  const [allWines, grapeSlugs] = await Promise.all([
    getWinesForSommelier(),
    getGrapeVarietySlugs(),
  ]);

  return grapeSlugs
    .filter((slug) => {
      const name = deslugify(slug);
      const wines = filterWinesByGrape(allWines, slug, name);
      return wines.length >= MIN_INDEXABLE_TOP_LIST_WINES;
    })
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: SoiuriPageProps): Promise<Metadata> {
  const { slug } = await params;
  const grapeName = deslugify(slug);
  const allWines = await getWinesForSommelier();
  const grapeWines = filterWinesByGrape(allWines, slug, grapeName);

  if (grapeWines.length < MIN_INDEXABLE_TOP_LIST_WINES) {
    return { title: "Soi negasit", robots: { index: false, follow: true } };
  }

  const title = `Soiul ${grapeName}: ghid si top vinuri romanesti`;
  const description = `Ghid despre ${grapeName}: caracteristici, regiuni si cele mai bune vinuri romanesti cu preturi in RON.`;
  const url = absoluteUrl(`/soiuri/${slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title: `${title} | VinIntel`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | VinIntel`,
      description,
    },
  };
}

export default async function SoiuriPage({ params }: SoiuriPageProps) {
  const { slug } = await params;
  const grapeName = deslugify(slug);
  const allWines = await getWinesForSommelier();
  const grapeWines = filterWinesByGrape(allWines, slug, grapeName);

  if (grapeWines.length < MIN_INDEXABLE_TOP_LIST_WINES) notFound();

  const topWines = getTopWinesByValue(grapeWines, 5);
  const topListSlug = `cele-mai-bune-${slug}`;
  const faq = buildGrapeFaq(grapeName, topWines, topListSlug);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Vinuri ${grapeName}`,
    numberOfItems: topWines.length,
    itemListElement: topWines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/wines/${wine.slug}`),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Vinuri", path: "/vinuri" },
    { name: grapeName, path: `/soiuri/${slug}` },
  ]);

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="soiuri"
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
              <span className="text-foreground">{grapeName}</span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Soiul {grapeName}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Ghid despre {grapeName} in viticultura romaneasca: stiluri, regiuni
              si cele mai bune vinuri din catalogul VinIntel.
            </p>
            <p className="mt-4">
              <Link
                href={`/topuri/${topListSlug}`}
                className="font-medium text-wine hover:underline"
              >
                Vezi clasamentul complet {grapeName}
              </Link>
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <section aria-labelledby="top-wines-heading">
            <h2
              id="top-wines-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              Top vinuri {grapeName}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topWines.map((wine) => (
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
