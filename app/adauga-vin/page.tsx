import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { SmartSearch } from "@/components/smart-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { localizedHref } from "@/i18n/paths";
import { getContentLocale, getContentTranslator } from "@/lib/i18n/content";
import { absoluteUrl, SITE } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const href = localizedHref(locale, "addWine");

  return {
    title: t("AddWine.metadata.title"),
    description: t("AddWine.metadata.description"),
    alternates: {
      canonical: absoluteUrl(href),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "addWine")),
        en: absoluteUrl(localizedHref("en", "addWine")),
        "x-default": absoluteUrl(localizedHref("ro", "addWine")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url: absoluteUrl(href),
      siteName: SITE.name,
      title: `${t("AddWine.metadata.title")} | VinIntel`,
      description: t("AddWine.metadata.ogDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("AddWine.metadata.title")} | VinIntel`,
      description: t("AddWine.metadata.ogDescription"),
    },
  };
}

export default async function AddWinePage() {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-wine/20 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {t("AddWine.badge")}
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("AddWine.title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("AddWine.description")}
          </p>
          <div className="mt-10 text-left">
            <SmartSearch
              locale={locale}
              placeholder={t("AddWine.placeholder")}
              copy={{
                placeholder: t("AddWine.placeholder"),
                ariaLabel: t("AddWine.search.ariaLabel"),
                analyzing: t("AddWine.search.analyzing"),
                submitLink: t("AddWine.search.submit"),
                search: t("AddWine.search.search"),
                loading: t("AddWine.search.loading"),
                sommelierHint: t("AddWine.search.sommelierHint"),
                emptyHint: t("AddWine.search.empty"),
                wineType: t("AddWine.search.wine"),
                wineryType: t("AddWine.search.winery"),
                linkHelper: t("AddWine.search.helper"),
                analysisFailed: t("AddWine.search.analysisFailed"),
                invalidResult: t("AddWine.search.invalidResult"),
                pendingReview: t("AddWine.search.pending"),
                alreadyPending: t("AddWine.search.alreadyPending"),
              }}
            />
          </div>
          <ol className="mt-10 space-y-3 text-left text-sm text-muted-foreground">
            <li>{t("AddWine.step1")}</li>
            <li>{t("AddWine.step2")}</li>
            <li>{t("AddWine.step3")}</li>
            <li>{t("AddWine.step4")}</li>
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
