"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { submitContactForm } from "@/app/actions/contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/i18n/locale";

export interface ClaimFormCopy {
  fallbackError: string;
  successTitle: string;
  successDescription: string;
  winery: string;
  wineryPlaceholder: string;
  name: string;
  namePlaceholder: string;
  role: string;
  rolePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  website: string;
  websitePlaceholder: string;
  message: string;
  messagePlaceholder: string;
  sending: string;
  submit: string;
  consent: string;
}

export function ClaimForm({
  defaultWineryName = "",
  locale,
  copy,
}: {
  defaultWineryName?: string;
  locale: AppLocale;
  copy: ClaimFormCopy;
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

    setError(
      locale === "en"
        ? copy.fallbackError
        : result.error ?? copy.fallbackError,
    );
  }

  if (submitted) {
    return (
      <Card className="border-wine/30 bg-wine/5">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-wine text-wine-foreground">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            {copy.successTitle}
          </h2>
          <p className="max-w-md text-muted-foreground">
            {copy.successDescription}
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
            <Label htmlFor="winery">{copy.winery}</Label>
            <Input
              id="winery"
              name="winery"
              required
              disabled={pending}
              defaultValue={defaultWineryName}
              placeholder={copy.wineryPlaceholder}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactName">{copy.name}</Label>
              <Input
                id="contactName"
                name="contactName"
                required
                disabled={pending}
                placeholder={copy.namePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{copy.role}</Label>
              <Input
                id="role"
                name="role"
                disabled={pending}
                placeholder={copy.rolePlaceholder}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">{copy.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                disabled={pending}
                placeholder={copy.emailPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{copy.phone}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                disabled={pending}
                placeholder={copy.phonePlaceholder}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">{copy.website}</Label>
            <Input
              id="website"
              name="website"
              disabled={pending}
              placeholder={copy.websitePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{copy.message}</Label>
            <Textarea
              id="message"
              name="message"
              rows={4}
              disabled={pending}
              placeholder={copy.messagePlaceholder}
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
            {pending ? copy.sending : copy.submit}
          </Button>

          <p className="text-xs text-muted-foreground">
            {copy.consent}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
