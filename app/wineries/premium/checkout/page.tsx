import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PremiumCheckoutForm } from "@/components/wineries/premium-checkout-form";
import { getWineryBySlug } from "@/lib/queries";
import { absoluteUrl, buildBreadcrumbJsonLd, SITE } from "@/lib/seo";
import { isStripeConfigured } from "@/lib/stripe/config";
import { parsePremiumPlan } from "@/lib/stripe/premium-plans";

const PATH = "/wineries/premium/checkout";

export const metadata: Metadata = {
  title: "Checkout Premium Profile",
  description:
    "Finalizeaza abonamentul Premium Profile pentru crama ta pe VinIntel.ro.",
  alternates: { canonical: absoluteUrl(PATH) },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Checkout Premium | VinIntel",
  },
};

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string; crama?: string }>;
}

export default async function PremiumCheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const { plan: planParam, crama } = await searchParams;
  const plan = parsePremiumPlan(planParam);
  const winery = crama ? await getWineryBySlug(crama) : null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Premium Profile", path: "/wineries/premium" },
    { name: "Checkout", path: PATH },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} id="premium-checkout-breadcrumb" />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <nav
              aria-label="Breadcrumb"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Link href="/" className="hover:text-wine">
                Acasa
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/wineries/premium" className="hover:text-wine">
                Premium
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">Checkout</span>
            </nav>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Checkout Premium Profile
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Alege planul, completeaza datele cramei si plateste in siguranta cu
              Stripe.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12">
          <PremiumCheckoutForm
            plan={plan}
            defaultWineryName={winery?.name ?? ""}
            defaultWinerySlug={winery?.slug ?? crama ?? ""}
            stripeConfigured={isStripeConfigured()}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
