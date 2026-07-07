"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { submitContactForm } from "@/app/actions/contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function PremiumContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set(
      "message",
      `Plan selectat: ${plan === "annual" ? "990 lei/an" : "99 lei/lună"}. ${clean(formData.get("message"))}`,
    );

    const result = await submitContactForm("winery_premium", formData);

    setPending(false);
    if (result.ok) {
      setSubmitted(true);
      return;
    }

    setError(result.error ?? "Nu am putut trimite cererea.");
  }

  if (submitted) {
    return (
      <Card className="border-wine/30 bg-wine/5">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-wine" aria-hidden="true" />
          <h3 className="font-serif text-xl font-semibold text-foreground">
            Cererea ta a fost trimisa
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Echipa VinIntel te contacteaza in 1-2 zile lucratoare pentru
            activarea Premium Profile si onboarding.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="contact-premium" className="border-border/70 scroll-mt-24">
      <CardContent className="p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-foreground">
          Alege Premium
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Completeaza formularul si revenim cu detalii de activare, facturare
          si configurarea profilului tau.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="premium-winery">Numele cramei *</Label>
              <Input
                id="premium-winery"
                name="wineryName"
                required
                placeholder="Ex: Cramele Recas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium-name">Nume contact *</Label>
              <Input
                id="premium-name"
                name="contactName"
                required
                placeholder="Prenume Nume"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="premium-email">Email *</Label>
              <Input
                id="premium-email"
                name="email"
                type="email"
                required
                placeholder="contact@crama.ro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium-phone">Telefon</Label>
              <Input
                id="premium-phone"
                name="phone"
                type="tel"
                placeholder="+40 ..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="premium-plan">Plan preferat</Label>
            <Select
              value={plan}
              onValueChange={(value) =>
                setPlan(value as "monthly" | "annual")
              }
            >
              <SelectTrigger id="premium-plan" className="w-full">
                <SelectValue placeholder="Alege planul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">
                  990 lei/an (2 luni gratuite)
                </SelectItem>
                <SelectItem value="monthly">99 lei/luna</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="premium-message">Mesaj (optional)</Label>
            <Textarea
              id="premium-message"
              name="message"
              rows={3}
              placeholder="Spune-ne ce vrei sa evidentiem pe profilul Premium..."
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-wine py-6 text-base text-wine-foreground hover:bg-wine/90"
          >
            {pending ? "Se trimite..." : "Contacteaza-ne pentru Premium"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
