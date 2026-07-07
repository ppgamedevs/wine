"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function WineryDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        Nu am putut incarca dashboard-ul
      </h1>
      <p className="max-w-md text-muted-foreground">
        A aparut o eroare la incarcarea statisticilor. Incearca din nou sau revino
        la profilul cramei.
      </p>
      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="bg-wine text-wine-foreground hover:bg-wine/90"
        >
          Incearca din nou
        </Button>
        <Button asChild variant="outline">
          <Link href="/crame">Lista crame</Link>
        </Button>
      </div>
    </div>
  );
}
