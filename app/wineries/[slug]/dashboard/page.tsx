import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WineryDashboardPanel } from "@/components/wineries/winery-dashboard-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getWineryDashboardStats } from "@/lib/winery-analytics-dashboard";
import { getWineryBySlug } from "@/lib/queries";
import { absoluteUrl, SITE } from "@/lib/seo";
import { isWineryPremium } from "@/lib/winery-premium";

export const revalidate = 300;
export const dynamicParams = true;

interface DashboardPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DashboardPageProps): Promise<Metadata> {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);

  if (!winery || !isWineryPremium(winery)) {
    return { title: "Dashboard indisponibil", robots: { index: false } };
  }

  return {
    title: `Dashboard ${winery.name}`,
    description: `Statistici Premium pentru ${winery.name}: vizualizari, click-uri si vinuri populare.`,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url: absoluteUrl(`/wineries/${winery.slug}/dashboard`),
      siteName: SITE.name,
      title: `Dashboard ${winery.name} | VinIntel`,
    },
    alternates: {
      canonical: absoluteUrl(`/wineries/${winery.slug}/dashboard`),
    },
  };
}

export default async function WineryDashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);

  if (!winery) notFound();

  if (!isWineryPremium(winery)) {
    redirect(`/wineries/${slug}`);
  }

  const stats = await getWineryDashboardStats(winery.id);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">
            <WineryDashboardPanel
              wineryName={winery.name}
              winerySlug={winery.slug}
              stats={stats}
              stripeCustomerId={winery.stripeCustomerId}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
