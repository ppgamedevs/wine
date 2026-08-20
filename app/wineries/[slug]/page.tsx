import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { LocalizedSiteFooter } from "@/components/localized-site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCard } from "@/components/wine-card";
import { WineryEventsCalendar } from "@/components/wineries/winery-events-calendar";
import { WineryHero } from "@/components/wineries/winery-hero";
import { WineryPageViewTracker } from "@/components/wineries/winery-page-view-tracker";
import { WineryPremiumBanner } from "@/components/wineries/winery-premium-banner";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { formatRon } from "@/lib/format";
import {
  buildWineryProfileJsonLd,
  getWineryProfileI18n,
  isWineryProfileIndexable,
  localizeWineryProfile,
} from "@/lib/i18n/winery-profile";
import { getAllWinerySlugs, getWineryBySlug, getWineryPublishedEvents } from "@/lib/queries";
import { resolveWineryLogoUrl } from "@/lib/winery-catalog";
import { isWineryPremium, canTrackWineryAnalytics } from "@/lib/winery-premium";
import { absoluteUrl, SITE, type FaqEntry } from "@/lib/seo";
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

function buildRomanianWineryFaq(winery: WineryWithWines): FaqEntry[] {
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
        ? `In acest moment, ${top.name} conduce, cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
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

type WineryProfileTranslator = Awaited<
  ReturnType<typeof getWineryProfileI18n>
>["t"];

function buildLocalizedWineryFaq(
  winery: WineryWithWines,
  locale: AppLocale,
  t: WineryProfileTranslator,
): FaqEntry[] {
  if (locale === "ro") return buildRomanianWineryFaq(winery);

  const top = winery.wines[0];
  const regionName = winery.region?.name ?? "Romania";
  const founded = winery.foundedYear
    ? t("faq.location.founded", { year: winery.foundedYear })
    : "";

  return [
    {
      question: t("faq.count.question", { name: winery.name }),
      answer: t("faq.count.answer", {
        count: winery.wines.length,
        name: winery.name,
      }),
    },
    {
      question: t("faq.best.question", { name: winery.name }),
      answer: top
        ? t("faq.best.answer", {
            wine: top.name,
            score: top.valueScore ?? "N/A",
            price: formatRon(top.priceAvg, locale),
          })
        : t("faq.best.empty", { name: winery.name }),
    },
    {
      question: t("faq.location.question", { name: winery.name }),
      answer: t("faq.location.answer", {
        name: winery.name,
        region: regionName,
        founded,
      }),
    },
    {
      question: t("faq.verified.question", { name: winery.name }),
      answer: winery.verified
        ? t("faq.verified.yes", { name: winery.name })
        : t("faq.verified.no", { name: winery.name }),
    },
  ];
}

export async function generateMetadata({
  params,
}: WineryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale, t }, sourceWinery] = await Promise.all([
    getWineryProfileI18n(),
    getWineryBySlug(slug),
  ]);

  if (!sourceWinery) return { title: t("metadata.notFound") };

  const sourceEvents = locale === "en" && isWineryPremium(sourceWinery)
    ? await getWineryPublishedEvents(sourceWinery.id)
    : [];
  const localized = await localizeWineryProfile(
    sourceWinery,
    sourceEvents,
    locale,
  );
  const winery = localized.winery;
  const wineCount = winery.wines.length;
  const path = localizedHref(locale, "winery", { slug: winery.slug });
  const url = absoluteUrl(path);
  const romanianUrl = absoluteUrl(
    localizedHref("ro", "winery", { slug: winery.slug }),
  );
  const englishUrl = absoluteUrl(
    localizedHref("en", "winery", { slug: winery.slug }),
  );
  const logoUrl = resolveWineryLogoUrl(winery.slug, winery.logoUrl);
  const description =
    winery.description ??
    t("metadata.descriptionFallback", {
      name: winery.name,
      region: winery.region?.name ?? "Romania",
      count: wineCount,
    });
  const shouldIndex = isWineryProfileIndexable(
    wineCount,
    locale,
    localized.limitedData,
  );

  return {
    title: winery.name,
    description,
    robots: shouldIndex
      ? { index: true, follow: true }
      : { index: false, follow: true },
    keywords: [
      winery.name,
      t("metadata.wineryKeyword"),
      winery.region?.name ?? "",
      t("metadata.romanianWineKeyword"),
    ].filter(Boolean),
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : SITE.locale,
      alternateLocale: locale === "en" ? SITE.locale : "en_GB",
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
    alternates: {
      canonical: url,
      languages: {
        ro: romanianUrl,
        en: englishUrl,
        "x-default": romanianUrl,
      },
    },
  };
}

export default async function WineryPage({ params }: WineryPageProps) {
  const { slug } = await params;
  const [{ locale, t }, sourceWinery] = await Promise.all([
    getWineryProfileI18n(),
    getWineryBySlug(slug),
  ]);

  if (!sourceWinery) notFound();

  const premium = isWineryPremium(sourceWinery);
  const trackAnalytics = canTrackWineryAnalytics(sourceWinery);
  const sourceEvents = premium
    ? await getWineryPublishedEvents(sourceWinery.id)
    : [];
  const localized = await localizeWineryProfile(
    sourceWinery,
    sourceEvents,
    locale,
  );
  const winery = localized.winery;
  const events = localized.events;

  const stats = computeStats(winery);
  const faq = buildLocalizedWineryFaq(winery, locale, t);
  const logoUrl = resolveWineryLogoUrl(winery.slug, winery.logoUrl);
  const jsonLd = buildWineryProfileJsonLd(
    winery,
    faq,
    locale,
    logoUrl,
    {
      home: t("structuredData.home"),
      wineries: t("structuredData.wineries"),
      wineList: t("structuredData.wineList", { name: winery.name }),
    },
  );
  const heroCopy = {
    breadcrumb: t("hero.breadcrumb"),
    home: t("hero.home"),
    wineries: t("hero.wineries"),
    verified: t("hero.verified"),
    unverified: t("hero.unverified"),
    founded: winery.foundedYear
      ? t("hero.founded", { year: winery.foundedYear })
      : "",
    officialWebsite: t("hero.officialWebsite"),
    listedWines: t("hero.listedWines"),
    averageValueScore: t("hero.averageValueScore"),
    priceRange: t("hero.priceRange"),
    visit: {
      visit: t("hero.visit"),
      unavailable: t("hero.visitUnavailable"),
    },
  };
  const eventCopy = {
    heading: t("events.heading"),
    intro: t("events.intro", { name: winery.name }),
    fallbackTitle: t("events.fallbackTitle"),
    details: t("events.details"),
    eventTypeLabels: {
      tasting: t("events.types.tasting"),
      tour: t("events.types.tour"),
      harvest: t("events.types.harvest"),
      festival: t("events.types.festival"),
      workshop: t("events.types.workshop"),
      other: t("events.types.other"),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} id="winery" />
      <SiteHeader />
      {trackAnalytics ? (
        <WineryPageViewTracker winerySlug={winery.slug} />
      ) : null}
      <main className="flex-1">
        {premium ? (
          <WineryPremiumBanner
            winery={winery}
            alt={t("banner.alt", { name: winery.name })}
          />
        ) : null}
        <WineryHero
          winery={winery}
          stats={stats}
          locale={locale}
          copy={heroCopy}
          links={{
            home: localizedHref(locale, "home"),
            wineries: localizedHref(locale, "wineries"),
            region: winery.region
              ? localizedHref(locale, "region", { slug: winery.region.slug })
              : null,
          }}
          trackAnalytics={trackAnalytics}
        />

        <div className="mx-auto max-w-6xl space-y-16 px-6 py-14">
          {locale === "en" && localized.limitedData ? (
            <section
              aria-labelledby="limited-winery-data-heading"
              className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6"
            >
              <h2
                id="limited-winery-data-heading"
                className="font-serif text-xl font-semibold text-foreground"
              >
                {t("limited.heading")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("limited.notice")}
              </p>
            </section>
          ) : null}

          {premium && events.length > 0 ? (
            <WineryEventsCalendar
              events={events}
              locale={locale}
              copy={eventCopy}
            />
          ) : null}

          <section aria-labelledby="wines-heading">
            <h2
              id="wines-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {locale === "ro"
                ? wineryWinesHeading(winery.name)
                : t("wines.heading", { name: winery.name })}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("wines.intro")}{" "}
              <Link
                href={localizedHref(locale, "howScoresWork")}
                className="font-medium text-wine hover:underline"
              >
                {t("wines.scoresLink")}
              </Link>
              .
            </p>

            {winery.wines.length > 0 ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {winery.wines.map((wine) => (
                  <WineCard
                    key={wine.slug}
                    wine={wine}
                    minValueScore={null}
                    trackAnalytics={
                      trackAnalytics
                        ? {
                            winerySlug: winery.slug,
                            wineSlug: wine.slug,
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center text-muted-foreground">
                {t("wines.empty")}
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
                      {locale === "ro"
                        ? wineryRepresentativeQuestion(winery.name)
                        : t("claim.heading", { name: winery.name })}
                    </h2>
                  </div>
                  <p className="mt-3 text-wine-foreground/85">
                    {t("claim.description")}
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="shrink-0 bg-cream text-wine hover:bg-cream/90"
                >
                  <Link
                    href={`${localizedHref(locale, "claimWinery")}?crama=${encodeURIComponent(winery.slug)}`}
                  >
                    {locale === "ro"
                      ? CLAIM_WINERY_BUTTON_LABEL
                      : t("claim.button")}
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
              {t("faq.heading")}
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
      <LocalizedSiteFooter />
    </>
  );
}
