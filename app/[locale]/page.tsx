import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FeaturedWines, FeaturedWinesSkeleton } from "@/components/featured-wines";
import { Hero, type HeroCopy } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { LocalizedSiteFooter } from "@/components/localized-site-footer";
import { Reveal } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import { buildSmartSearchCopy } from "@/components/smart-search";
import { TopLists } from "@/components/top-lists";
import { ValueProps } from "@/components/value-props";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/i18n/paths";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";
import { absoluteUrl, buildFaqJsonLd, SITE, type FaqEntry } from "@/lib/seo";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_FAIR_MIN,
} from "@/lib/value-score-thresholds";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDiscoveryI18n();
  const path = localizedHref(locale, "home");
  const title = t("Home.metadata.title");
  const description = t("Home.metadata.description");

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: absoluteUrl(path),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "home")),
        en: absoluteUrl(localizedHref("en", "home")),
        "x-default": absoluteUrl(localizedHref("ro", "home")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : SITE.locale,
      url: absoluteUrl(path),
      siteName: SITE.name,
      title,
      description: t("Home.metadata.openGraphDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage() {
  const { locale, t } = await getDiscoveryI18n();
  const homeFaq: FaqEntry[] = [
    {
      question: t("Home.faq.what.question"),
      answer: t("Home.faq.what.answer"),
    },
    {
      question: t("Home.faq.value.question"),
      answer: t("Home.faq.value.answer", {
        recommended: MIN_RECOMMENDED_VALUE_SCORE,
        fair: VALUE_SCORE_FAIR_MIN,
        upperFair: MIN_RECOMMENDED_VALUE_SCORE - 1,
      }),
    },
    {
      question: t("Home.faq.find.question"),
      answer: t("Home.faq.find.answer"),
    },
    {
      question: t("Home.faq.prices.question"),
      answer: t("Home.faq.prices.answer"),
    },
  ];
  const heroCopy: HeroCopy = {
    badge: t("Hero.badge"),
    title: t("Hero.title"),
    titleAccent: t("Hero.titleAccent"),
    description: t("Hero.description"),
    frequentSearches: t("Hero.frequentSearches"),
    links: {
      catalog: t("Hero.links.catalog"),
      best: t("Hero.links.best"),
      budget: t("Hero.links.budget"),
      wineries: t("Hero.links.wineries"),
      sarmale: t("Hero.links.sarmale"),
      sommelier: t("Hero.links.sommelier"),
    },
    search: buildSmartSearchCopy(t),
  };

  return (
    <>
      <JsonLd data={buildFaqJsonLd(homeFaq)} id="home-faq" />
      <SiteHeader />
      <main className="flex-1">
        <Hero copy={heroCopy} locale={locale} />
        <ValueProps />

        <Suspense fallback={<FeaturedWinesSkeleton />}>
          <FeaturedWines />
        </Suspense>

        <TopLists />

        <section className="py-20" aria-labelledby="home-faq-heading">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal className="text-center">
              <h2
                id="home-faq-heading"
                className="font-serif text-3xl font-semibold text-foreground sm:text-4xl"
              >
                {t("Home.faq.heading")}
              </h2>
              <p className="mt-4 text-balance text-muted-foreground">
                {t("Home.faq.intro")}
              </p>
            </Reveal>
            <div className="mt-10 space-y-3">
              {homeFaq.map((item, index) => (
                <Reveal key={item.question} delay={index * 0.05}>
                  <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
                    <h3 className="font-medium text-foreground">
                      {item.question}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-wine/20 bg-wine px-8 py-14 text-center text-wine-foreground sm:px-14">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-20"
                >
                  <div className="absolute right-[-4rem] top-[-4rem] h-64 w-64 rounded-full bg-gold/40 blur-3xl" />
                </div>
                <h2 className="font-serif text-3xl font-bold sm:text-4xl">
                  {t("Home.cta.heading")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-balance text-wine-foreground/85">
                  {t("Home.cta.description")}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-8 bg-cream text-wine hover:bg-cream/90"
                >
                  <Link href={localizedHref(locale, "aiSommelier")}>
                    {t("Home.cta.button")}
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <LocalizedSiteFooter />
    </>
  );
}
