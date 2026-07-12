"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cauta]", error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Cautarea nu a mers
        </h1>
        <p className="mt-4 text-muted-foreground">
          Nu am putut incarca rezultatele. Incearca din nou sau foloseste
          catalogul de vinuri.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} className="bg-wine text-wine-foreground">
            Incearca din nou
          </Button>
          <Button asChild variant="outline">
            <Link href="/vinuri">Catalog vinuri</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
