"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
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
        Ceva nu a mers bine
      </h1>
      <p className="max-w-md text-muted-foreground">
        A aparut o eroare neasteptata. Incearca din nou sau revino mai tarziu.
      </p>
      <Button
        onClick={reset}
        className="bg-wine text-wine-foreground hover:bg-wine/90"
      >
        Incearca din nou
      </Button>
    </div>
  );
}
