import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PremiumBadge } from "@/components/wineries/premium-badge";
import { WineryBillingPortalButton } from "@/components/wineries/winery-billing-portal-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { absoluteUrl, SITE } from "@/lib/seo";
import { fulfillPremiumCheckout } from "@/lib/stripe/premium-checkout";
import { getPremiumPlan } from "@/lib/stripe/premium-plans";
import { isStripeConfigured } from "@/lib/stripe/config";

export const metadata: Metadata = {
  title: "Plata confirmata",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    siteName: SITE.name,
    title: "Premium activat | VinIntel",
  },
};

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PremiumSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) notFound();

  if (!isStripeConfigured()) {
    notFound();
  }

  const result = await fulfillPremiumCheckout(sessionId);
  if (!result) notFound();

  const planDef = getPremiumPlan(result.plan);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <Card className="border-wine/20 bg-gradient-to-br from-wine/[0.05] via-card to-background">
            <CardContent className="space-y-6 p-8 sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-wine/10 text-wine">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <PremiumBadge className="mx-auto" />
              <h1 className="font-serif text-3xl font-bold text-foreground">
                Plata confirmata
              </h1>
              <p className="text-muted-foreground">
                Abonamentul <strong>{planDef.label}</strong> (
                {planDef.priceLabel}) pentru{" "}
                <strong>{result.wineryName}</strong> este activ la Stripe.
              </p>
              <p className="text-sm text-muted-foreground">
                Am trimis confirmarea la{" "}
                <span className="font-medium text-foreground">{result.email}</span>.
                {result.alreadyProcessed
                  ? " Aceasta sesiune fusese deja procesata."
                  : null}
              </p>

              {!result.wineryMatched ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm text-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>
                      Nu am gasit inca crama in catalog dupa numele introdus. Plata este
                      inregistrata, iar echipa VinIntel va activa manual profilul Premium
                      sau te va contacta pentru potrivirea slug-ului corect.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                {result.winerySlug ? (
                  <>
                    <Button
                      asChild
                      className="bg-wine text-wine-foreground hover:bg-wine/90"
                    >
                      <Link href={`/wineries/${result.winerySlug}/dashboard`}>
                        Deschide dashboard-ul
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/wineries/${result.winerySlug}`}>
                        Vezi profilul cramei
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/wineries/premium">Inapoi la Premium</Link>
                  </Button>
                )}
              </div>

              {result.winerySlug && result.stripeCustomerId ? (
                <div className="flex justify-center pt-2">
                  <WineryBillingPortalButton
                    winerySlug={result.winerySlug}
                    label="Gestioneaza abonamentul in Stripe"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
