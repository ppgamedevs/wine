import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/locale";
import { getLocale } from "next-intl/server";
import { localizedHref } from "@/i18n/paths";
import { loadVintageGuide } from "@/lib/vintage/query";
import { classificationLabel } from "@/lib/vintage/story";
import { absoluteUrl, SITE } from "@/lib/seo";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const title = locale === "ro" ? "Ghidul recoltelor" : "Vintage guide";
  const description =
    locale === "ro"
      ? "Context evidence-based pentru recoltele de vin din România, pe regiuni și ani."
      : "Evidence-based vintage context for Romanian wine regions and harvest years.";
  const path = localizedHref(locale, "vintageGuide");
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(path),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "vintageGuide")),
        en: absoluteUrl(localizedHref("en", "vintageGuide")),
        "x-default": absoluteUrl(localizedHref("ro", "vintageGuide")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : SITE.locale,
      url: absoluteUrl(path),
      siteName: SITE.name,
      title: `${title} | VinIntel`,
      description,
    },
  };
}

export default async function VintageGuidePage() {
  const locale = (await getLocale()) as AppLocale;
  const entries = await loadVintageGuide();
  const t = (ro: string, en: string) => (locale === "ro" ? ro : en);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-wine">
            {t("Context de recoltă", "Vintage context")}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground sm:text-5xl">
            {t("Ghidul recoltelor", "Vintage guide")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t(
              "Rezumate pe regiune și an, construite din surse citate. O recoltă bună la nivel regional nu este automat o notă pentru fiecare sticlă.",
              "Region-and-year summaries built from cited sources. A good regional vintage is not automatically a score for every bottle.",
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Fără scor numeric inventat", "No invented numeric score")}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Regiune + an", "Region + year")}
            </Badge>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-8">
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                {t("Încă nu există dovezi pentru ghid", "No guide evidence yet")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {t(
                  "Nu afișăm clasificări inventate. Ghidul se populează doar după ce sursele oficiale, independente sau notele de recoltă sunt înregistrate cu URL, excerpt și încredere.",
                  "We do not display invented classifications. The guide is populated only after official, independent or harvest-note evidence is recorded with a URL, excerpt and confidence.",
                )}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {entries.map((entry) => (
                <article
                  key={`${entry.region}-${entry.vintage ?? "NV"}`}
                  className="rounded-2xl border border-border/70 bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {entry.region}
                      </p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-foreground">
                        {entry.vintage ?? t("Fără an", "Non-vintage")}
                      </h2>
                    </div>
                    <span className="rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground">
                      {classificationLabel(entry.classification, locale)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {entry.evidenceCount} {t("dovezi", "evidence items")} ·{" "}
                    {entry.independentSources} {t("surse independente", "independent sources")}
                  </p>
                  {entry.sources.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs">
                      {entry.sources.slice(0, 3).map((source) => (
                        <li key={source.url}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-wine underline-offset-4 hover:underline"
                          >
                            {source.title}
                            <ChevronRight className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          )}
          <div className="mt-8">
            <Link
              href={localizedHref(locale, "wines")}
              className="text-sm font-medium text-wine underline-offset-4 hover:underline"
            >
              {t("Înapoi la catalogul de vinuri", "Back to the wine catalog")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
