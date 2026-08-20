import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineAvailability } from "@/components/wines/wine-availability";
import { WineFaq } from "@/components/wines/wine-faq";
import { WineDualScores } from "@/components/wines/wine-dual-scores";
import { WineEditorial } from "@/components/wines/wine-editorial";
import { WineHero } from "@/components/wines/wine-hero";
import { WinePairings } from "@/components/wines/wine-pairings";
import { WineRelatedSections } from "@/components/wines/wine-related-sections";
import { WineScoreCards } from "@/components/wines/wine-score-cards";
import { WineSpecsTable } from "@/components/wines/wine-specs-table";
import { WineWineryLink } from "@/components/wines/wine-winery-link";
import { WineDataFreshness } from "@/components/wines/wine-data-freshness";
import { WineReportButton } from "@/components/wines/wine-report-button";
import { WineCatalogNotice } from "@/components/wines/wine-catalog-notice";
import { VerificationLeadForm } from "@/components/wines/verification-lead-form";
import {
  getAllWineSlugs,
  getRecommendedWines,
  getSimilarWines,
  getWineBySlug,
  getWineryWineCount,
} from "@/lib/queries";
import { buildWineFullTitle } from "@/lib/wine-vintage";
import { buildWineFaq } from "@/lib/wine-analysis";
import { buildWineJsonLd, buildWineMetadataDescription } from "@/lib/wine-json-ld";
import { absoluteUrl } from "@/lib/seo";
import { resolveWineImage } from "@/lib/wine-images";
import { EXISTING_WINE_CATALOG_MESSAGE } from "@/lib/wine-submission-messages";
import { getPublicWineTechnicalTrust } from "@/lib/tech-facts/public-trust-query";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedHref } from "@/i18n/paths";
import { localizeWineDetailForEnglish } from "@/lib/i18n/wine-detail";
import { localizeWineSubmissionMessage } from "@/lib/wine-submission-messages";
import type { AppLocale } from "@/i18n/locale";
import type { WineWithRelations } from "@/types";

export const revalidate = 3600;
export const dynamicParams = true;

interface WinePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}

async function localizedWineDetail(
  wine: WineWithRelations,
  locale: AppLocale,
) {
  if (locale === "en") return localizeWineDetailForEnglish(wine);
  return { wine, limitedData: false, missingFields: [] };
}

export async function generateStaticParams() {
  const slugs = await getAllWineSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: WinePageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Wine.metadata" });
  const sourceWine = await getWineBySlug(slug);

  if (!sourceWine) {
    return { title: t("notFound") };
  }

  const localized = await localizedWineDetail(sourceWine, locale);
  const wine = localized.wine;
  const title = buildWineFullTitle(wine.name, wine.vintage);
  const description = buildWineMetadataDescription(wine, locale);
  const canonicalPath = localizedHref(locale, "wine", { slug: wine.slug });
  const url = absoluteUrl(canonicalPath);
  const romanianUrl = absoluteUrl(
    localizedHref("ro", "wine", { slug: wine.slug }),
  );
  const englishUrl = absoluteUrl(
    localizedHref("en", "wine", { slug: wine.slug }),
  );
  const { src: imageUrl, alt: imageAlt } = resolveWineImage(wine);
  const ogImages = imageUrl
    ? [{ url: imageUrl, width: 800, height: 600, alt: imageAlt }]
    : undefined;

  return {
    title,
    description,
    keywords: [
      wine.name,
      wine.winery?.name ?? "",
      wine.region?.name ?? "",
      t("romanianWineKeyword"),
      "Value Score",
      ...(wine.foodPairings ?? []).map((p) =>
        t("pairingKeyword", { dish: p.dish.toLowerCase() }),
      ),
      ...(wine.dessertPairings ?? []).map(
        (p) => t("pairingKeyword", { dish: p.dish.toLowerCase() }),
      ),
    ].filter(Boolean),
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : "ro_RO",
      alternateLocale: locale === "en" ? "ro_RO" : "en_GB",
      url,
      title: `${title} | VinIntel`,
      description,
      siteName: "VinIntel",
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${title} | VinIntel`,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    alternates: {
      canonical: url,
      languages: {
        ro: romanianUrl,
        en: englishUrl,
        "x-default": romanianUrl,
      },
    },
    ...(locale === "en" && localized.limitedData
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),
  };
}

export default async function WinePage({ params, searchParams }: WinePageProps) {
  const { slug } = await params;
  const { notice } = await searchParams;
  const locale = await getLocale();
  const reportT = await getTranslations("Wine.report");
  const verificationT = await getTranslations("Wine.verification");
  const sourceWine = await getWineBySlug(slug);

  if (!sourceWine) notFound();

  const [similar, recommended, wineryWineCount, technicalTrust] =
    await Promise.all([
    getSimilarWines(sourceWine, 4),
    getRecommendedWines(sourceWine, 4),
    sourceWine.wineryId
      ? getWineryWineCount(sourceWine.wineryId)
      : Promise.resolve(0),
      getPublicWineTechnicalTrust(sourceWine.id, sourceWine),
    ]);

  const localized = await localizedWineDetail(sourceWine, locale);
  const wine = localized.wine;
  const faq = buildWineFaq(wine, locale);
  const jsonLd = buildWineJsonLd(wine, faq, technicalTrust, locale);

  return (
    <>
      {jsonLd.map((schema) => (
        <script
          key={schema["@type"] as string}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <SiteHeader />
      {notice === "existing" ? (
        <WineCatalogNotice
          message={
            localizeWineSubmissionMessage(
              EXISTING_WINE_CATALOG_MESSAGE,
              locale,
              "existing",
            ) ?? EXISTING_WINE_CATALOG_MESSAGE
          }
        />
      ) : null}
      <main className="flex-1">
        <WineHero wine={wine} technicalTrust={technicalTrust} />

        <div className="mx-auto max-w-6xl space-y-14 px-6 py-10 sm:space-y-16 sm:py-14">
          <WineAvailability wine={wine} />
          <WinePairings wine={wine} technicalTrust={technicalTrust} />
          <WineScoreCards wine={wine} />
          <WineRelatedSections
            wine={wine}
            similar={similar}
            recommended={recommended}
          />
          <WineDualScores wine={wine} />

          {wine.status === "user_submitted" ? (
            <section
                aria-label={reportT("communityAria")}
              className="rounded-2xl border border-border/70 bg-secondary/20 px-5 py-4"
            >
              <p className="text-sm text-muted-foreground">
                {reportT("communityIntro")}
              </p>
              <div className="mt-3">
                <WineReportButton
                  wineSlug={wine.slug}
                  labels={{
                    trigger: reportT("trigger"),
                    title: reportT("title"),
                    description: reportT("description"),
                    thanks: reportT("thanks"),
                    placeholder: reportT("placeholder"),
                    cancel: reportT("cancel"),
                    sending: reportT("sending"),
                    submit: reportT("submit"),
                    submitError: reportT("submitError"),
                  }}
                />
              </div>
            </section>
          ) : null}

          <WineSpecsTable wine={wine} trust={technicalTrust} />
          <WineDataFreshness wine={wine} />
          <WineEditorial wine={wine} limitedData={localized.limitedData} />
          {wine.winery ? (
            <WineWineryLink wine={wine} wineCount={wineryWineCount} />
          ) : null}
          <WineFaq items={faq} />

          {wine.winery ? (
            <VerificationLeadForm
              wineryName={wine.winery.name}
              wineName={wine.name}
              labels={{
                submitError: verificationT("submitError"),
                sent: verificationT("sent"),
                contact: verificationT("contact", {
                  winery: wine.winery.name,
                }),
                title: verificationT("title"),
                intro: verificationT("intro", {
                  winery: wine.winery.name,
                  wine: wine.name,
                }),
                name: verificationT("name"),
                email: verificationT("email"),
                message: verificationT("message"),
                messageAria: verificationT("messageAria"),
                sending: verificationT("sending"),
                submit: verificationT("submit"),
              }}
            />
          ) : null}

        </div>
      </main>
      <SiteFooter />
    </>
  );
}
