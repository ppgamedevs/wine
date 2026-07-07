"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface WineryBillingPortalButtonProps {
  winerySlug: string;
  label?: string;
  variant?: "default" | "outline";
}

export function WineryBillingPortalButton({
  winerySlug,
  label = "Gestioneaza abonamentul",
  variant = "outline",
}: WineryBillingPortalButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winerySlug }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Portal indisponibil.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la portal.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        onClick={() => void openPortal()}
        disabled={pending}
        className={
          variant === "outline" ? "border-wine/30 text-wine hover:bg-wine/5" : undefined
        }
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Se deschide Stripe...
          </>
        ) : (
          label
        )}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
