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
import { WineWorthIt } from "@/components/wines/wine-worth-it";
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
import { buildWineJsonLd, buildWineMetadataDescription } from "@/lib/wine-json-ld";
import { absoluteUrl } from "@/lib/seo";
import { resolveWineImage } from "@/lib/wine-images";
import { EXISTING_WINE_CATALOG_MESSAGE } from "@/lib/wine-submission-messages";

export const revalidate = 3600;
export const dynamicParams = true;

interface WinePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllWineSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: WinePageProps): Promise<Metadata> {
  const { slug } = await params;
  const wine = await getWineBySlug(slug);

  if (!wine) {
    return { title: "Vin negasit" };
  }

  const title = buildWineFullTitle(wine.name, wine.vintage);
  const description = buildWineMetadataDescription(wine);
  const url = absoluteUrl(`/wines/${wine.slug}`);
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
      "vin romanesc",
      "Value Score",
      ...(wine.foodPairings ?? []).map((p) => `vin pentru ${p.dish.toLowerCase()}`),
      ...(wine.dessertPairings ?? []).map(
        (p) => `vin pentru ${p.dish.toLowerCase()}`,
      ),
    ].filter(Boolean),
    openGraph: {
      type: "website",
      locale: "ro_RO",
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
    alternates: { canonical: url },
  };
}

export default async function WinePage({ params, searchParams }: WinePageProps) {
  const { slug } = await params;
  const { notice } = await searchParams;
  const wine = await getWineBySlug(slug);

  if (!wine) notFound();

  const [similar, recommended, wineryWineCount] = await Promise.all([
    getSimilarWines(wine, 4),
    getRecommendedWines(wine, 4),
    wine.wineryId ? getWineryWineCount(wine.wineryId) : Promise.resolve(0),
  ]);

  const faq = buildWineFaq(wine);
  const jsonLd = buildWineJsonLd(wine, faq);

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
        <WineCatalogNotice message={EXISTING_WINE_CATALOG_MESSAGE} />
      ) : null}
      <main className="flex-1">
        <WineHero wine={wine} />

        <div className="mx-auto max-w-6xl space-y-16 px-6 py-14">
          <WineEditorial wine={wine} />
          <WineDualScores wine={wine} />

          {wine.status === "user_submitted" ? (
            <section
              aria-label="Feedback comunitate"
              className="rounded-2xl border border-border/70 bg-secondary/20 px-5 py-4"
            >
              <p className="text-sm text-muted-foreground">
                Acest vin a fost adaugat de comunitate si analizat automat.
                Ajuta-ne sa il imbunatatim.
              </p>
              <div className="mt-3">
                <WineReportButton wineId={wine.id} />
              </div>
            </section>
          ) : null}

          <WineScoreCards wine={wine} />
          <WineWorthIt wine={wine} />
          {wine.winery ? (
            <WineWineryLink wine={wine} wineCount={wineryWineCount} />
          ) : null}
          <WineSpecsTable wine={wine} />
          <WinePairings wine={wine} />
          <WineAvailability wine={wine} />
          <WineFaq items={faq} />

          {wine.winery ? (
            <VerificationLeadForm
              wineryName={wine.winery.name}
              wineName={wine.name}
            />
          ) : null}

          <WineRelatedSections
            wine={wine}
            similar={similar}
            recommended={recommended}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
