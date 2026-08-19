"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface LocaleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error, reset }: LocaleErrorProps) {
  const t = useTranslations("Error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        {t("title")}
      </h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Button
        onClick={reset}
        className="bg-wine text-wine-foreground hover:bg-wine/90"
      >
        {t("retry")}
      </Button>
    </div>
  );
}
