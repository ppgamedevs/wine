"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AddWineError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-foreground">
          Ceva nu a mers bine
        </h1>
        <p className="mt-3 text-muted-foreground">
          Nu am putut incarca pagina. Incearca din nou sau revino la homepage.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} className="bg-wine text-wine-foreground">
            Incearca din nou
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Acasa</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
