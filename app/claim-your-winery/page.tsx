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
import { getWineryBySlug } from "@/lib/queries";
import { absoluteUrl, buildBreadcrumbJsonLd, SITE } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revendica-ti crama",
  description:
    "Esti producator de vin? Revendica-ti crama pe VinIntel, verifica datele, actualizeaza vinurile si ajungi in fata cumparatorilor care cauta calitate.",
  alternates: { canonical: absoluteUrl("/claim-your-winery") },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl("/claim-your-winery"),
    siteName: SITE.name,
    title: "Revendica-ti crama | VinIntel",
    description:
      "Verifica datele cramei tale, actualizeaza vinurile si castiga incredere in fata cumparatorilor.",
  },
};

const benefits: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}[] = [
  {
    icon: MarketingVerifiedBadgeIcon,
    title: "Badge de crama verificata",
    description:
      "Profilul tau primeste un badge de incredere, vizibil pe fiecare vin din portofoliu.",
  },
  {
    icon: MarketingDataIcon,
    title: "Date corecte si actualizate",
    description:
      "Corecteaza preturi, vintage-uri, specificatii tehnice si pairing-uri direct de la sursa.",
  },
  {
    icon: MarketingVisibilityIcon,
    title: "Mai multa vizibilitate",
    description:
      "Vinurile verificate apar mai sus in topuri si in recomandarile AI Sommelier.",
  },
  {
    icon: MarketingFastIcon,
    title: "Gratuit si rapid",
    description:
      "Revendicarea este gratuita. Te contactam in 2-3 zile lucratoare pentru activare.",
  },
];

interface ClaimPageProps {
  searchParams: Promise<{ crama?: string }>;
}

export default async function ClaimYourWineryPage({
  searchParams,
}: ClaimPageProps) {
  const { crama } = await searchParams;
  const winery = crama ? await getWineryBySlug(crama) : null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Revendica-ti crama", path: "/claim-your-winery" },
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
              Pentru producatori
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Revendica-ti crama pe VinIntel
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Ia controlul asupra modului in care crama si vinurile tale apar in
              fata miilor de pasionati care cauta vinuri romanesti bune. Verifica
              datele, actualizeaza informatiile si castiga incredere.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              De ce sa iti revendici crama
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
            <ClaimForm defaultWineryName={winery?.name ?? ""} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
