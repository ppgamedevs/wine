import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCard } from "@/components/wine-card";
import { WineryEventsCalendar } from "@/components/wineries/winery-events-calendar";
import { WineryHero } from "@/components/wineries/winery-hero";
import { WineryPageViewTracker } from "@/components/wineries/winery-page-view-tracker";
import { WineryPremiumBanner } from "@/components/wineries/winery-premium-banner";
import { Button } from "@/components/ui/button";
import { formatRon } from "@/lib/format";
import { getAllWinerySlugs, getWineryBySlug, getWineryPublishedEvents } from "@/lib/queries";
import { resolveWineryLogoUrl } from "@/lib/winery-catalog";
import { isWineryPremium, canTrackWineryAnalytics } from "@/lib/winery-premium";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";
import { buildWineryMakesOfferEntry } from "@/lib/wine-json-ld";
import {
  CLAIM_WINERY_BUTTON_LABEL,
  wineryLocationQuestion,
  wineryRepresentativeQuestion,
  wineryWinesHeading,
} from "@/lib/winery-copy";
import type { WineryWithWines } from "@/types";

export const revalidate = 3600;
export const dynamicParams = true;

interface WineryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllWinerySlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

function computeStats(winery: WineryWithWines) {
  const wineCount = winery.wines.length;

  const valueScores = winery.wines
    .map((w) => w.valueScore)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgValueScore =
    valueScores.length > 0
      ? Math.round(valueScores.reduce((a, b) => a + b, 0) / valueScores.length)
      : null;

  const prices = winery.wines
    .map((w) => w.priceAvg)
    .filter((p): p is number => p !== null && p !== undefined);
  const priceRange =
    prices.length > 0
      ? { min: Math.round(Math.min(...prices)), max: Math.round(Math.max(...prices)) }
      : null;

  return { wineCount, avgValueScore, priceRange };
}

function buildWineryFaq(winery: WineryWithWines): FaqEntry[] {
  const top = winery.wines[0];
  const regionName = winery.region?.name ?? "Romania";

  return [
    {
      question: `Cate vinuri are ${winery.name} pe VinIntel?`,
      answer: `Avem ${winery.wines.length} vinuri de la ${winery.name} in baza de date, ordonate dupa Value Score, cu preturi in RON si pairing-uri.`,
    },
    {
      question: `Care este cel mai bun vin de la ${winery.name}?`,
      answer: top
        ? `In acest moment, ${top.name}${top.vintage ? ` ${top.vintage}` : ""} conduce, cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
        : `Actualizam constant lista de vinuri de la ${winery.name}.`,
    },
    {
      question: wineryLocationQuestion(winery.name),
      answer: `${winery.name} se afla in regiunea ${regionName}${winery.foundedYear ? ` si a fost fondata in ${winery.foundedYear}` : ""}.`,
    },
    {
      question: `Este ${winery.name} o crama verificata?`,
      answer: winery.verified
        ? `Da, ${winery.name} este o crama verificata in baza noastra de date.`
        : `${winery.name} nu este inca verificata oficial. Daca reprezinti aceasta crama, poti solicita verificarea.`,
    },
  ];
}

export async function generateMetadata({
  params,
}: WineryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);

  if (!winery) return { title: "Crama negasita" };

  const wineCount = winery.wines.length;
  const url = absoluteUrl(`/wineries/${winery.slug}`);
  const logoUrl = resolveWineryLogoUrl(winery.slug, winery.logoUrl);
  const description =
    winery.description ??
    `${winery.name} din ${winery.region?.name ?? "Romania"}: ${wineCount} vinuri, scoruri, preturi in RON si pairing-uri.`;

  return {
    title: winery.name,
    description,
    robots:
      wineCount === 0
        ? { index: false, follow: true }
        : { index: true, follow: true },
    keywords: [
      winery.name,
      "crama",
      winery.region?.name ?? "",
      "vinuri romanesti",
    ].filter(Boolean),
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title: `${winery.name} | VinIntel`,
      description,
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${winery.name} | VinIntel`,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function WineryPage({ params }: WineryPageProps) {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);

  if (!winery) notFound();

  const premium = isWineryPremium(winery);
  const trackAnalytics = canTrackWineryAnalytics(winery);
  const events = premium
    ? await getWineryPublishedEvents(winery.id)
    : [];

  const stats = computeStats(winery);
  const faq = buildWineryFaq(winery);
  const url = absoluteUrl(`/wineries/${winery.slug}`);
  const logoUrl = resolveWineryLogoUrl(winery.slug, winery.logoUrl);

  const wineryJsonLd = {
    "@context": "https://schema.org",
    "@type": "Winery",
    name: winery.name,
    description: winery.description ?? undefined,
    url,
    logo: logoUrl ?? undefined,
    foundingDate: winery.foundedYear ? String(winery.foundedYear) : undefined,
    sameAs:
      winery.verified && winery.website ? [winery.website] : undefined,
    address: winery.region
      ? {
          "@type": "PostalAddress",
          addressRegion: winery.region.name,
          addressCountry: "RO",
        }
      : undefined,
    makesOffer: winery.wines
      .slice(0, 10)
      .map((wine) => buildWineryMakesOfferEntry(wine)),
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Vinuri de la ${winery.name}`,
    numberOfItems: winery.wines.length,
    itemListElement: winery.wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/wines/${wine.slug}`),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Crame", path: "/crame" },
    { name: winery.name, path: `/wineries/${winery.slug}` },
  ]);

  return (
    <>
      <JsonLd
        data={[
          wineryJsonLd,
          itemListJsonLd,
          breadcrumbJsonLd,
          buildFaqJsonLd(faq),
        ]}
        id="winery"
      />
      <SiteHeader />
      {trackAnalytics ? <WineryPageViewTracker wineryId={winery.id} /> : null}
      <main className="flex-1">
        {premium ? <WineryPremiumBanner winery={winery} /> : null}
        <WineryHero winery={winery} stats={stats} trackAnalytics={trackAnalytics} />

        <div className="mx-auto max-w-6xl space-y-16 px-6 py-14">
          {premium && events.length > 0 ? (
            <WineryEventsCalendar events={events} wineryName={winery.name} />
          ) : null}

          <section aria-labelledby="wines-heading">
            <h2
              id="wines-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {wineryWinesHeading(winery.name)}
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ordonate dupa Value Score, indicatorul nostru pentru raportul
              calitate-pret.{" "}
              <Link
                href="/cum-functioneaza-scorurile"
                className="font-medium text-wine hover:underline"
              >
                Cum calculam scorurile
              </Link>
              .
            </p>

            {winery.wines.length > 0 ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {winery.wines.map((wine) => (
                  <WineCard
                    key={wine.id}
                    wine={wine}
                    minValueScore={null}
                    trackAnalytics={
                      trackAnalytics
                        ? { wineryId: winery.id, wineId: wine.id }
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center text-muted-foreground">
                Inca nu avem vinuri listate pentru aceasta crama.
              </p>
            )}
          </section>

          {!winery.verified ? (
            <section
              aria-labelledby="claim-heading"
              className="overflow-hidden rounded-3xl border border-wine/20 bg-wine px-8 py-12 text-wine-foreground sm:px-12"
            >
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    <h2 id="claim-heading" className="font-serif text-2xl font-bold">
                      {wineryRepresentativeQuestion(winery.name)}
                    </h2>
                  </div>
                  <p className="mt-3 text-wine-foreground/85">
                    Revendica profilul, verifica datele si actualizeaza informatiile
                    despre vinurile tale. Gratuit si rapid.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="shrink-0 bg-cream text-wine hover:bg-cream/90"
                >
                  <Link href={`/claim-your-winery?crama=${winery.slug}`}>
                    {CLAIM_WINERY_BUTTON_LABEL}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
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
