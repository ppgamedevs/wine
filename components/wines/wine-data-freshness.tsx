import { Clock } from "lucide-react";
import { formatLongDate } from "@/lib/format";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { WineWithRelations } from "@/types";
import type { AppLocale } from "@/i18n/locale";
import { getLocale, getTranslations } from "next-intl/server";

function resolveFreshness(
  wine: WineWithRelations,
  locale: AppLocale,
): {
  date: string | undefined;
  isPriceDate: boolean;
} {
  const history = wine.priceHistory ?? [];
  if (history.length > 0) {
    const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest?.date) {
      return { date: formatLongDate(latest.date, locale), isPriceDate: true };
    }
  }
  return { date: formatLongDate(wine.updatedAt, locale), isPriceDate: false };
}

export async function WineDataFreshness({ wine }: { wine: WineWithRelations }) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.freshness");
  const pricing = buildWinePriceViewModel(wine);
  const freshness = resolveFreshness(wine, locale);

  if (!freshness.date) return null;

  return (
    <section
      aria-label={t("aria")}
      className="rounded-2xl border border-border/70 bg-secondary/20 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-wine" aria-hidden="true" />
        <div className="text-sm text-muted-foreground">
          <p>
            {t("atDate", {
              label: freshness.isPriceDate
                ? pricing.isVerifiedRecent
                  ? t("verifiedPrice")
                  : t("updatedPrice")
                : t("updatedPage"),
              date: freshness.date,
            })}
          </p>
          {pricing.status === "estimated" ? (
            <p className="mt-1">
              {t("estimatedWarning")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
