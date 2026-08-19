import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buildSub50Study2026 } from "@/lib/data-insights";
import { formatRon } from "@/lib/format";
import { getWinesForSommelier } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  buildLocalizedAlternates,
  getPseoMessages,
  localizedWineHref,
  openGraphLocale,
} from "@/lib/i18n/pseo";

export const revalidate = 86400;

const STUDY_SLUG = "cele-mai-bune-vinuri-sub-50-lei-2026";

interface StudiiPageProps {
  params: Promise<{ slug: string }>;
}

function buildStudyFaq(
  data: ReturnType<typeof buildSub50Study2026>,
  locale: AppLocale,
): FaqEntry[] {
  const top = data.top50[0];
  if (locale === "en") {
    return [
      {
        question: "What is the best Romanian wine under 50 RON in 2026?",
        answer: top
          ? `${top.name} from ${top.winery?.name ?? "an unknown winery"} leads with a Value Score of ${top.valueScore ?? "N/A"}/100 at ${formatRon(top.priceAvg, locale)}.`
          : "We update the study as new wines enter the catalog.",
      },
      {
        question: "How many wines under 50 RON are included?",
        answer: `We analyzed ${data.totalWinesAnalyzed} catalog wines, including ${data.winesUnder50} priced below 50 RON.`,
      },
      {
        question: "How is Value Score calculated?",
        answer:
          "Value Score combines estimated quality, price in RON, availability and market signals. See How our scores work for details.",
      },
    ];
  }
  return [
    {
      question: "Care este cel mai bun vin romanesc sub 50 lei in 2026?",
      answer: top
        ? `${top.name} de la ${top.winery?.name ?? "crama necunoscuta"} conduce cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
        : "Actualizam studiul periodic pe masura ce apar vinuri noi in catalog.",
    },
    {
      question: "Cate vinuri sub 50 lei sunt in studiu?",
      answer: `Am analizat ${data.totalWinesAnalyzed} vinuri in catalog; ${data.winesUnder50} au pret sub 50 lei.`,
    },
    {
      question: "Cum calculati Value Score?",
      answer:
        "Value Score combina calitatea estimata, pretul in RON, disponibilitatea si semnale de piata. Detalii pe pagina Cum functioneaza scorurile.",
    },
  ];
}

export async function generateStaticParams() {
  return [{ slug: STUDY_SLUG }];
}

export async function generateMetadata({ params }: StudiiPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const copy = getPseoMessages(locale).study;
  if (slug !== STUDY_SLUG) {
    return { title: getPseoMessages(locale).common.notFound };
  }

  const title = copy.title;
  const description = copy.description;
  const path = localizedHref(locale, "study", { slug });
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "study", { slug }),
      localizedHref("en", "study", { slug }),
    ),
    openGraph: {
      type: "article",
      locale: openGraphLocale(locale),
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

export default async function StudiiPage({ params }: StudiiPageProps) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const messages = getPseoMessages(locale);
  const copy = messages.study;
  if (slug !== STUDY_SLUG) notFound();

  const allWines = await getWinesForSommelier();
  const study = buildSub50Study2026(allWines);
  const faq = buildStudyFaq(study, locale);
  const updatedLabel = new Date(study.generatedAt).toLocaleDateString(
    locale === "en" ? "en-GB" : "ro-RO",
    {
    day: "numeric",
    month: "long",
    year: "numeric",
    },
  );
  const path = localizedHref(locale, "study", { slug });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    inLanguage: locale === "en" ? "en" : "ro",
    headline: copy.title,
    datePublished: "2026-01-01",
    dateModified: study.generatedAt,
    author: { "@type": "Organization", name: "VinIntel" },
    publisher: { "@type": "Organization", name: "VinIntel", url: SITE.url },
    mainEntityOfPage: absoluteUrl(path),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    { name: messages.common.studies, path },
  ]);

  return (
    <>
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]} id="studii" />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:py-14">
            <nav
              aria-label="Breadcrumb"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Link
                href={localizedHref(locale, "home")}
                className="hover:text-wine"
              >
                {messages.common.home}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{copy.breadcrumb}</span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {copy.intro.replace(
                "{count}",
                String(study.totalWinesAnalyzed),
              )}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {copy.updated} {updatedLabel}
            </p>
            <p className="mt-4">
              <Link
                href={localizedHref(locale, "topWine", {
                  slug:
                    locale === "en"
                      ? "wines-under-50-ron"
                      : "vinuri-sub-50-lei",
                })}
                className="font-medium text-wine hover:underline"
              >
                {copy.interactiveTop}
              </Link>
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="font-serif text-2xl font-semibold text-foreground">
              {copy.dataSummary}
            </h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-border/70 bg-secondary/30">
                  <tr>
                    <th className="px-4 py-3 font-medium">{copy.indicator}</th>
                    <th className="px-4 py-3 font-medium">{copy.value}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3">{copy.winesUnder50}</td>
                    <td className="px-4 py-3 font-medium">{study.winesUnder50}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3">{copy.averagePrice}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatRon(study.avgPriceUnder50, locale)}
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3">{copy.averageValue}</td>
                    <td className="px-4 py-3 font-medium">{study.avgValueScoreUnder50}/100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="top-table-heading">
            <h2 id="top-table-heading" className="font-serif text-2xl font-semibold text-foreground">
              {copy.top50}
            </h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border/70 bg-secondary/30">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">
                      {messages.common.wine}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {messages.common.winery}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {messages.common.price}
                    </th>
                    <th className="px-4 py-3 font-medium">Value Score</th>
                  </tr>
                </thead>
                <tbody>
                  {study.top50.map((wine, index) => (
                    <tr key={wine.id} className="border-b border-border/50">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={localizedWineHref(locale, wine)}
                          className="text-wine hover:underline"
                        >
                          {wine.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{wine.winery?.name ?? "-"}</td>
                      <td className="px-4 py-3">
                        {formatRon(wine.priceAvg, locale)}
                      </td>
                      <td className="px-4 py-3">
                        {wine.valueScore ?? "-"}/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="font-serif text-2xl font-semibold text-foreground">
              {messages.common.faq}
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
