"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function SoiuriHubError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Nu am putut incarca ghidul de soiuri
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Incearca din nou sau revino la catalogul de vinuri.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={reset} variant="outline">
            Reincearca
          </Button>
          <Button asChild className="bg-wine text-wine-foreground hover:bg-wine/90">
            <Link href="/vinuri">Vinuri</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
