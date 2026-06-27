"use client";

import { Building2, CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface VerificationLeadFormProps {
  wineryName: string;
  wineName: string;
}

export function VerificationLeadForm({
  wineryName,
  wineName,
}: VerificationLeadFormProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="border-wine/30 bg-wine/5">
        <CardContent className="flex items-center gap-4 p-6">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-wine" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Cerere trimisa</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Te contactam in 2-3 zile lucratoare pentru verificarea cramei{" "}
              {wineryName}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h3 className="font-serif text-xl font-semibold text-foreground">
              Solicita verificare crama
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esti reprezentant al cramei {wineryName}? Solicita verificarea
              oficiala pentru {wineName} si toate vinurile din portofoliu.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <Input
                type="text"
                name="name"
                placeholder="Numele tau"
                required
                aria-label="Numele tau"
              />
              <Input
                type="email"
                name="email"
                placeholder="Email de contact"
                required
                aria-label="Email de contact"
              />
              <Textarea
                name="message"
                placeholder="Mesaj optional (website, CUI, detalii)"
                rows={3}
                aria-label="Mesaj optional"
              />
              <Button
                type="submit"
                className="w-full bg-wine text-wine-foreground hover:bg-wine/90 sm:w-auto"
              >
                Trimite cererea
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
