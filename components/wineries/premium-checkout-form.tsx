"use client";

import { Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PremiumBadge } from "@/components/wineries/premium-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PremiumCheckoutPlan } from "@/lib/schema";
import { getPremiumPlan } from "@/lib/stripe/premium-plans";

interface PremiumCheckoutFormProps {
  plan: PremiumCheckoutPlan;
  defaultWineryName?: string;
  defaultWinerySlug?: string;
  stripeConfigured: boolean;
}

export function PremiumCheckoutForm({
  plan,
  defaultWineryName = "",
  defaultWinerySlug = "",
  stripeConfigured,
}: PremiumCheckoutFormProps) {
  const planDef = getPremiumPlan(plan);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/stripe/premium-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          wineryName: formData.get("wineryName"),
          winerySlug: formData.get("winerySlug") || undefined,
          email: formData.get("email"),
          phone: formData.get("phone") || undefined,
        }),
      });

      const data: {
        error?: string;
        url?: string;
        existingSubscription?: boolean;
      } = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout indisponibil.");
      }

      if (data.existingSubscription) {
        window.location.href = data.url;
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la checkout.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="border-wine/20 bg-gradient-to-br from-wine/[0.06] via-card to-background">
        <CardContent className="p-6 sm:p-8">
          <PremiumBadge />
          <h2 className="mt-4 font-serif text-2xl font-semibold text-foreground">
            {planDef.label}
          </h2>
          <p className="mt-2 font-serif text-4xl font-bold text-wine">
            {planDef.priceLabel}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {planDef.description}
          </p>
          <ul className="mt-6 space-y-2 text-sm text-foreground/90">
            <li>Banner si poveste editoriala personalizata</li>
            <li>Calendar evenimente + analytics</li>
            <li>Lead capture si prioritate AI Sommelier</li>
            <li>Featured placement in catalog</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button
              asChild
              variant={plan === "annual" ? "outline" : "default"}
              className={
                plan === "monthly"
                  ? "bg-wine text-wine-foreground hover:bg-wine/90"
                  : "border-wine/30"
              }
            >
              <Link href="/wineries/premium/checkout?plan=monthly">Lunar</Link>
            </Button>
            <Button
              asChild
              variant={plan === "annual" ? "default" : "outline"}
              className={
                plan === "annual"
                  ? "bg-wine text-wine-foreground hover:bg-wine/90"
                  : "border-wine/30"
              }
            >
              <Link href="/wineries/premium/checkout?plan=annual">Anual</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-6 sm:p-8">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Date facturare si contact
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Completeaza datele cramei, apoi continui la plata securizata Stripe.
          </p>

          {!stripeConfigured ? (
            <p className="mt-6 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              Plata online nu este configurata (lipseste STRIPE_SECRET_KEY).
              Contacteaza echipa VinIntel sau foloseste formularul de pe pagina Premium.
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wineryName">Nume crama *</Label>
              <Input
                id="wineryName"
                name="wineryName"
                required
                defaultValue={defaultWineryName}
                placeholder="Ex: Cramele Recas"
              />
            </div>

            {defaultWinerySlug ? (
              <input type="hidden" name="winerySlug" value={defaultWinerySlug} />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="winerySlug">Slug crama (optional)</Label>
                <Input
                  id="winerySlug"
                  name="winerySlug"
                  placeholder="ex: cramele-recas"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email contact *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="contact@crama.ro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon (optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+40 ..."
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              disabled={pending || !stripeConfigured}
              className="w-full bg-wine py-6 text-base text-wine-foreground hover:bg-wine/90"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Redirect catre Stripe...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Plateste cu Stripe
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Plata securizata procesata de Stripe. Abonament recurent conform
              planului ales.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
