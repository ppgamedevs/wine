"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminWinesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="font-serif text-3xl font-semibold">Eroare admin</h1>
      <p className="mt-3 text-muted-foreground">
        Nu am putut incarca panelul. Verifica autentificarea si incearca din nou.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Reincearca</Button>
        <Button asChild variant="outline">
          <Link href="/admin/login">Login admin</Link>
        </Button>
      </div>
    </main>
  );
}
