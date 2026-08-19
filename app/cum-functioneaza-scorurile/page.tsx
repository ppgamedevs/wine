import type { Metadata } from "next";
import {
  Award,
  BookOpen,
  Gift,
  Scale,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { localizedHref } from "@/i18n/paths";
import { getContentLocale, getContentTranslator } from "@/lib/i18n/content";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";
import { CONFIDENCE_SCORE_CEILINGS } from "@/lib/scoring-v2/constants";
import { VALUE_SCORE_BANDS } from "@/lib/value-score-thresholds";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const href = localizedHref(locale, "howScoresWork");

  return {
    title: t("Scores.metadata.title"),
    description: t("Scores.metadata.description"),
    alternates: {
      canonical: absoluteUrl(href),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "howScoresWork")),
        en: absoluteUrl(localizedHref("en", "howScoresWork")),
        "x-default": absoluteUrl(localizedHref("ro", "howScoresWork")),
      },
    },
    openGraph: {
      type: "article",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url: absoluteUrl(href),
      siteName: SITE.name,
      title: `${t("Scores.metadata.title")} | VinIntel`,
      description: t("Scores.metadata.shortDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("Scores.metadata.title")} | VinIntel`,
      description: t("Scores.metadata.shortDescription"),
    },
  };
}

export default async function ScoringMethodologyPage() {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const path = localizedHref(locale, "howScoresWork");
  const scores = [
    {
      icon: Scale,
      name: "Value Score",
      range: "0 - 100",
      summary: t("Scores.valueSummary"),
      factors: [
        t("Scores.valueFactor1"),
        t("Scores.valueFactor2"),
        t("Scores.valueFactor3"),
      ],
    },
    {
      icon: Gift,
      name: "Gift Score",
      range: "0 - 100",
      summary: t("Scores.giftSummary"),
      factors: [
        t("Scores.giftFactor1"),
        t("Scores.giftFactor2"),
        t("Scores.giftFactor3"),
      ],
    },
    {
      icon: Utensils,
      name: t("Scores.foodName"),
      range: "0 - 100",
      summary: t("Scores.foodSummary"),
      factors: [
        t("Scores.foodFactor1"),
        t("Scores.foodFactor2"),
        t("Scores.foodFactor3"),
      ],
    },
  ];
  const confidenceLabels: Record<number, string> = {
    85: t("Scores.confidenceVeryHigh"),
    70: t("Scores.confidenceHigh"),
    50: t("Scores.confidenceModerate"),
    30: t("Scores.confidenceLow"),
    0: t("Scores.confidenceInsufficient"),
  };
  const indicators = [
    {
      icon: BookOpen,
      name: t("Scores.beginnerName"),
      description: t("Scores.beginnerDescription"),
    },
    {
      icon: TrendingUp,
      name: t("Scores.agingName"),
      description: t("Scores.agingDescription"),
    },
    {
      icon: Award,
      name: t("Scores.overrateName"),
      description: t("Scores.overrateDescription"),
    },
  ];
  const faq: FaqEntry[] = [
    {
      question: t("Scores.faq1Question"),
      answer: t("Scores.faq1Answer"),
    },
    {
      question: t("Scores.faq2Question"),
      answer: t("Scores.faq2Answer"),
    },
    {
      question: t("Scores.faq3Question"),
      answer: t("Scores.faq3Answer"),
    },
    {
      question: t("Scores.faq4Question"),
      answer: t("Scores.faq4Answer"),
    },
    {
      question: t("Scores.faq5Question"),
      answer: t("Scores.faq5Answer"),
    },
  ];
  const valueBandKeys = [
    "exceptional",
    "veryGood",
    "recommended",
    "fair",
    "modest",
    "overpriced",
  ] as const;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("LegalShell.home"), path: localizedHref(locale, "home") },
    { name: t("Scores.metadata.title"), path },
  ]);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t("Scores.title"),
    description: t("Scores.metadata.description"),
    inLanguage: locale === "en" ? "en-GB" : SITE.language,
    mainEntityOfPage: absoluteUrl(path),
    author: { "@type": "Organization", name: SITE.name },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") },
    },
  };

  return (
    <>
      <JsonLd
        data={[articleJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="methodology"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-14 text-center lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("Scores.badge")}
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {t("Scores.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t("Scores.intro")}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-16 px-6 py-14">
          <section aria-labelledby="scores-heading">
            <h2
              id="scores-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Scores.scoresTitle")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("Scores.scoresIntro")}
            </p>

            <div className="mt-8 space-y-5">
              {scores.map((score) => (
                <div
                  key={score.name}
                  className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
                      <score.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-serif text-xl font-semibold text-foreground">
                          {score.name}
                        </h3>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {score.range}
                        </span>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {score.summary}
                      </p>
                      <ul className="mt-4 space-y-2">
                        {score.factors.map((factor) => (
                          <li
                            key={factor}
                            className="flex gap-2.5 text-sm text-muted-foreground"
                          >
                            <span
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine"
                              aria-hidden="true"
                            />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="scale-heading">
            <h2
              id="scale-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Scores.scaleTitle")}
            </h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">
                      {t("Scores.scoreHead")}
                    </TableHead>
                    <TableHead>{t("Scores.interpretationHead")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VALUE_SCORE_BANDS.map((band, index) => (
                    <TableRow key={band.label}>
                      <TableCell className="font-semibold text-foreground">
                        {band.min === 0
                          ? t("Scores.below", { value: band.max + 1 })
                          : `${band.min} - ${band.max}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`Scores.bands.${valueBandKeys[index]}`)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section aria-labelledby="confidence-heading">
            <h2
              id="confidence-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Scores.confidenceTitle")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("Scores.confidenceP1")}
            </p>
            <p className="mt-3 text-muted-foreground">
              {t("Scores.confidenceP2")}
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">
                      {t("Scores.confidenceHead")}
                    </TableHead>
                    <TableHead>{t("Scores.maxScoreHead")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONFIDENCE_SCORE_CEILINGS.map((tier) => (
                    <TableRow key={tier.minConfidencePercent}>
                      <TableCell className="font-semibold text-foreground">
                        {confidenceLabels[tier.minConfidencePercent] ??
                          `${tier.minConfidencePercent}%+`}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({tier.minConfidencePercent}%
                          {tier.minConfidencePercent === 85 ? "+" : "-..."})
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tier.maxScore === 97
                          ? t("Scores.noExtraCeiling")
                          : t("Scores.maximum", { score: tier.maxScore })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("Scores.confidenceDetail")}
            </p>
          </section>

          <section
            id="verificarea-datelor"
            aria-labelledby="verification-heading"
            className="scroll-mt-24"
          >
            <h2
              id="verification-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Scores.verificationTitle")}
            </h2>
            <div className="mt-3 max-w-3xl space-y-3 leading-relaxed text-muted-foreground">
              <p>{t("Scores.verificationP1")}</p>
              <p>{t("Scores.verificationP2")}</p>
              <p>{t("Scores.verificationP3")}</p>
            </div>
          </section>

          <section aria-labelledby="indicators-heading">
            <h2
              id="indicators-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Scores.indicatorsTitle")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("Scores.indicatorsIntro")}
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {indicators.map((indicator) => (
                <div
                  key={indicator.name}
                  className="rounded-2xl border border-border/70 bg-card p-6"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-wine/10 text-wine">
                    <indicator.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-medium text-foreground">
                    {indicator.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {indicator.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="trust-heading"
            className="rounded-3xl border border-wine/20 bg-wine/5 p-8 sm:p-10"
          >
            <h2
              id="trust-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {t("Scores.independenceTitle")}
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              {t("Scores.independence")}
            </p>
          </section>

          <section aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Scores.faqTitle")}
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

          <section className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              {t("Scores.ctaTitle")}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-wine text-wine-foreground hover:bg-wine/90"
              >
                <Link href={localizedHref(locale, "aiSommelier")}>
                  {t("Scores.sommelierCta")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link
                  href={
                    locale === "ro"
                      ? "/topuri/vinuri-sub-100-lei"
                      : localizedHref(locale, "topWines")
                  }
                >
                  {t("Scores.topCta")}
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
