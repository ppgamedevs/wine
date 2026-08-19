import type { Metadata } from "next";
import { Award } from "lucide-react";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TopListGrid } from "@/components/top-list-grid";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  resolveTopListDefinition,
  topListSlugForLocale,
} from "@/lib/i18n/top-list-routes";
import {
  buildLocalizedAlternates,
  getPseoMessages,
  getTopListIndexCopy,
  openGraphLocale,
} from "@/lib/i18n/pseo";
import {
  TOP_LIST_INDEX_LINKS,
  type TopListLink,
} from "@/lib/top-list-links";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

const INDEX_GRAPE_SLUGS = TOP_LIST_INDEX_LINKS.flatMap(({ slug }) =>
  slug.startsWith("cele-mai-bune-") &&
  slug !== "cele-mai-bune-vinuri-romanesti"
    ? [slug.slice("cele-mai-bune-".length)]
    : [],
);

const INDEX_FAQ = {
  ro: [
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
  ],
  en: [
    {
      question: "How does VinIntel build its wine rankings?",
      answer:
        "The rankings combine Value Score, price, wine style, occasion and grape variety using verified catalog data. Lists update as new wines are added.",
    },
    {
      question: "What does wine under 50 RON mean?",
      answer:
        "These selections have an average price below 50 Romanian lei and are ordered by value for money.",
    },
    {
      question: "Can I suggest a new ranking?",
      answer:
        "Yes. Contact VinIntel or use the Add wine page if a wine is missing from a ranking.",
    },
  ],
} as const;

function localizedIndexLinks(locale: AppLocale): TopListLink[] {
  return TOP_LIST_INDEX_LINKS.map(({ slug }) => {
    const definition = resolveTopListDefinition(
      slug,
      "ro",
      INDEX_GRAPE_SLUGS,
    );
    if (!definition) {
      throw new Error(`Unknown top-list index slug: ${slug}`);
    }
    const copy = getTopListIndexCopy(locale, definition.id);
    return {
      ...copy,
      slug: topListSlugForLocale(definition, locale),
    };
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const copy = getPseoMessages(locale).topLists;
  const path = localizedHref(locale, "topWines");
  const url = absoluteUrl(path);

  return {
    title: copy.indexTitle,
    description: copy.indexDescription,
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "topWines"),
      localizedHref("en", "topWines"),
    ),
    openGraph: {
      type: "website",
      locale: openGraphLocale(locale),
      url,
      siteName: SITE.name,
      title: `${copy.indexTitle} | VinIntel`,
      description: copy.indexDescription,
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${copy.indexTitle} | VinIntel`,
      description: copy.indexDescription,
    },
  };
}

export default async function TopuriIndexPage() {
  const locale = (await getLocale()) as AppLocale;
  const messages = getPseoMessages(locale);
  const copy = messages.topLists;
  const links = localizedIndexLinks(locale);
  const path = localizedHref(locale, "topWines");
  const faq = [...INDEX_FAQ[locale]];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    { name: messages.common.topLists, path },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: locale === "en" ? "en" : "ro",
    name: copy.indexTitle,
    numberOfItems: links.length,
    itemListElement: links.map((link, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(localizedHref(locale, "topWine", { slug: link.slug })),
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
              {links.length} {copy.countLabel}
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {copy.indexTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {copy.indexIntro}
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 border-wine/30 text-wine hover:bg-wine/10 hover:text-wine"
            >
              <Link href={localizedHref(locale, "wines")}>
                {copy.catalogCta}
              </Link>
            </Button>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12">
          <TopListGrid links={links} locale={locale} />
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
              {messages.common.faq}
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
