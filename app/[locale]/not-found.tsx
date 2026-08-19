import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { DEFAULT_LOCALE, isAppLocale } from "@/i18n/locale";

export default async function LocaleNotFound() {
  const requestedLocale = await getLocale();
  const locale = isAppLocale(requestedLocale)
    ? requestedLocale
    : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "Route" });

  return (
    <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-wine">
        404
      </p>
      <h1 className="font-serif text-4xl font-bold text-foreground">
        {t("notFoundTitle")}
      </h1>
      <p className="max-w-md text-muted-foreground">
        {t("notFoundDescription")}
      </p>
      <Button asChild className="bg-wine text-wine-foreground hover:bg-wine/90">
        <Link href="/" locale={locale}>
          {t("backHome")}
        </Link>
      </Button>
    </main>
  );
}
