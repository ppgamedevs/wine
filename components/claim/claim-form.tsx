"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { submitContactForm } from "@/app/actions/contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClaimForm({
  defaultWineryName = "",
}: {
  defaultWineryName?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await submitContactForm("winery_claim", formData);

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
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-wine text-wine-foreground">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Multumim! Cererea ta a fost trimisa
          </h2>
          <p className="max-w-md text-muted-foreground">
            Echipa VinIntel te va contacta in 2-3 zile lucratoare pentru a
            confirma datele si a activa profilul cramei tale.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="winery">Numele cramei</Label>
            <Input
              id="winery"
              name="winery"
              required
              disabled={pending}
              defaultValue={defaultWineryName}
              placeholder="ex. Crama Exemplu"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactName">Numele tau</Label>
              <Input
                id="contactName"
                name="contactName"
                required
                disabled={pending}
                placeholder="Nume si prenume"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol in cadrul cramei</Label>
              <Input
                id="role"
                name="role"
                disabled={pending}
                placeholder="ex. proprietar, marketing"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                disabled={pending}
                placeholder="email@crama.ro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon (optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                disabled={pending}
                placeholder="07xx xxx xxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website sau CUI (optional)</Label>
            <Input
              id="website"
              name="website"
              disabled={pending}
              placeholder="https://crama.ro sau CUI"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mesaj (optional)</Label>
            <Textarea
              id="message"
              name="message"
              rows={4}
              disabled={pending}
              placeholder="Spune-ne cum te putem ajuta sa iti revendici crama."
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="w-full bg-wine text-wine-foreground hover:bg-wine/90 sm:w-auto"
          >
            {pending ? "Se trimite..." : "Trimite cererea de revendicare"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Prin trimiterea formularului esti de acord sa fii contactat de
            echipa VinIntel in legatura cu revendicarea cramei.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
