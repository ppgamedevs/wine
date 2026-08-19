"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const ERROR_COPY = {
  ro: {
    title: "Ceva nu a mers bine",
    description:
      "A aparut o eroare neasteptata. Incearca din nou sau revino mai tarziu.",
    retry: "Incearca din nou",
  },
  en: {
    title: "Something went wrong",
    description:
      "An unexpected error occurred. Try again or come back later.",
    retry: "Try again",
  },
} as const;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const copy = ERROR_COPY[
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ro"
  ];
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        {copy.title}
      </h1>
      <p className="max-w-md text-muted-foreground">
        {copy.description}
      </p>
      <Button
        onClick={reset}
        className="bg-wine text-wine-foreground hover:bg-wine/90"
      >
        {copy.retry}
      </Button>
    </div>
  );
}
