import type { ComponentType, SVGProps } from "react";
import { ClaimForm } from "@/components/claim/claim-form";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  MarketingDataIcon,
  MarketingFastIcon,
  MarketingVerifiedBadgeIcon,
  MarketingVisibilityIcon,
} from "@/components/marketing-icons";
import { localizedHref } from "@/i18n/paths";
import { getContentLocale, getContentTranslator } from "@/lib/i18n/content";
import { getWineryBySlug } from "@/lib/queries";
import { absoluteUrl, buildBreadcrumbJsonLd, SITE } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const href = localizedHref(locale, "claimWinery");

  return {
    title: t("ClaimWinery.metadata.title"),
    description: t("ClaimWinery.metadata.description"),
    alternates: {
      canonical: absoluteUrl(href),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "claimWinery")),
        en: absoluteUrl(localizedHref("en", "claimWinery")),
        "x-default": absoluteUrl(localizedHref("ro", "claimWinery")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url: absoluteUrl(href),
      siteName: SITE.name,
      title: `${t("ClaimWinery.metadata.title")} | VinIntel`,
      description: t("ClaimWinery.metadata.ogDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("ClaimWinery.metadata.title")} | VinIntel`,
      description: t("ClaimWinery.metadata.ogDescription"),
    },
  };
}

interface ClaimPageProps {
  searchParams: Promise<{ crama?: string }>;
}

export default async function ClaimYourWineryPage({
  searchParams,
}: ClaimPageProps) {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const { crama } = await searchParams;
  const winery = crama ? await getWineryBySlug(crama) : null;
  const claimHref = localizedHref(locale, "claimWinery");
  const benefits: {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
  }[] = [
    {
      icon: MarketingVerifiedBadgeIcon,
      title: t("ClaimWinery.benefit1Title"),
      description: t("ClaimWinery.benefit1Description"),
    },
    {
      icon: MarketingDataIcon,
      title: t("ClaimWinery.benefit2Title"),
      description: t("ClaimWinery.benefit2Description"),
    },
    {
      icon: MarketingVisibilityIcon,
      title: t("ClaimWinery.benefit3Title"),
      description: t("ClaimWinery.benefit3Description"),
    },
    {
      icon: MarketingFastIcon,
      title: t("ClaimWinery.benefit4Title"),
      description: t("ClaimWinery.benefit4Description"),
    },
  ];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("LegalShell.home"), path: localizedHref(locale, "home") },
    { name: t("ClaimWinery.metadata.title"), path: claimHref },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} id="claim" />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-14 text-center lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <MarketingVerifiedBadgeIcon className="h-4 w-4" aria-hidden="true" />
              {t("ClaimWinery.badge")}
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {t("ClaimWinery.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t("ClaimWinery.description")}
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              {t("ClaimWinery.why")}
            </h2>
            <ul className="mt-6 space-y-5">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <li key={benefit.title} className="flex gap-4">
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        "border border-wine/25 bg-gradient-to-br from-wine/[0.08] via-background to-wine/[0.12]",
                        "text-wine shadow-sm ring-1 ring-wine/10",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {benefit.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <ClaimForm
              defaultWineryName={winery?.name ?? ""}
              locale={locale}
              copy={{
                fallbackError: t("ClaimWinery.form.fallbackError"),
                successTitle: t("ClaimWinery.form.successTitle"),
                successDescription: t(
                  "ClaimWinery.form.successDescription",
                ),
                winery: t("ClaimWinery.form.winery"),
                wineryPlaceholder: t(
                  "ClaimWinery.form.wineryPlaceholder",
                ),
                name: t("ClaimWinery.form.name"),
                namePlaceholder: t("ClaimWinery.form.namePlaceholder"),
                role: t("ClaimWinery.form.role"),
                rolePlaceholder: t("ClaimWinery.form.rolePlaceholder"),
                email: t("ClaimWinery.form.email"),
                emailPlaceholder: t("ClaimWinery.form.emailPlaceholder"),
                phone: t("ClaimWinery.form.phone"),
                phonePlaceholder: t("ClaimWinery.form.phonePlaceholder"),
                website: t("ClaimWinery.form.website"),
                websitePlaceholder: t(
                  "ClaimWinery.form.websitePlaceholder",
                ),
                message: t("ClaimWinery.form.message"),
                messagePlaceholder: t(
                  "ClaimWinery.form.messagePlaceholder",
                ),
                sending: t("ClaimWinery.form.sending"),
                submit: t("ClaimWinery.form.submit"),
                consent: t("ClaimWinery.form.consent"),
              }}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
