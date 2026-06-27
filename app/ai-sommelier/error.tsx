"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AiSommelierError({
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
        Somelierul a intampinat o problema
      </h1>
      <p className="max-w-md text-muted-foreground">
        Nu am putut incarca recomandarile. Incearca din nou.
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
