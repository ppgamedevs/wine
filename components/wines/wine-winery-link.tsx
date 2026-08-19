import { ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { WineryLogo } from "@/components/wineries/winery-logo";
import { Button } from "@/components/ui/button";
import type { WineWithRelations } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedHref } from "@/i18n/paths";

interface WineWineryLinkProps {
  wine: WineWithRelations;
  wineCount: number;
}

export async function WineWineryLink({
  wine,
  wineCount,
}: WineWineryLinkProps) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.winery");
  const winery = wine.winery;
  if (!winery) return null;

  return (
    <section aria-labelledby="winery-link-heading">
      <h2 id="winery-link-heading" className="sr-only">
        {t("heading")}
      </h2>

      <Link
        href={localizedHref(locale, "winery", { slug: winery.slug })}
        className="group block overflow-hidden rounded-3xl border border-border/70 bg-card transition-all duration-300 hover:border-wine/35 hover:shadow-lg"
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <WineryLogo
              name={winery.name}
              logoUrl={winery.logoUrl}
              size="inline"
            />

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("label")}
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground transition-colors group-hover:text-wine sm:text-3xl">
                {winery.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {wineCount > 1
                  ? t("listedWines", { count: wineCount })
                  : t("profileIntro")}
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="shrink-0 border-wine/25 bg-background group-hover:border-wine/40 group-hover:bg-wine/[0.04]"
          >
            <span className="inline-flex items-center gap-2">
              {t("view")}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Button>
        </div>
      </Link>

      {wine.tastingSheetUrl || wine.producerPageUrl ? (
        <div className="mt-3 flex flex-wrap justify-end gap-4">
          {wine.producerPageUrl ? (
            <a
              href={wine.producerPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-wine hover:underline"
            >
              {t("officialPage")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
          {wine.tastingSheetUrl ? (
            <a
              href={wine.tastingSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-wine hover:underline"
            >
              {t("tastingSheet")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
