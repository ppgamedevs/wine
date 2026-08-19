import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { WineCard } from "@/components/wine-card";
import { buildProgrammaticLinks } from "@/lib/wine-analysis";
import { VALUE_SCORE_NEUTRAL_MIN } from "@/lib/value-score-thresholds";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { WineWithRelations } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedHref } from "@/i18n/paths";

interface WineRelatedSectionsProps {
  wine: WineWithRelations;
  similar: WineWithRelations[];
  recommended: WineWithRelations[];
}

export async function WineRelatedSections({
  wine,
  similar,
  recommended,
}: WineRelatedSectionsProps) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.related");
  const programmaticLinks = buildProgrammaticLinks(wine, locale);
  const pricing = buildWinePriceViewModel(wine);
  const alternatives = recommended.length > 0 ? recommended : similar;
  const alternativeIntro =
    pricing.purchaseLink == null
      ? t("noOfferIntro")
      : (wine.valueScore ?? 0) < VALUE_SCORE_NEUTRAL_MIN
        ? t("betterValueIntro")
        : t("nearbyIntro");

  return (
    <div id="alternative" className="scroll-mt-24">
      {alternatives.length > 0 ? (
        <section aria-labelledby="recommended-heading">
          <h2
            id="recommended-heading"
            className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("alternatives")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {alternativeIntro}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {alternatives.map((item) => (
              <WineCard
                key={item.id}
                wine={item}
                minValueScore={recommended.length > 0 ? undefined : null}
              />
            ))}
          </div>
        </section>
      ) : (
        <section aria-labelledby="recommended-heading">
          <h2
            id="recommended-heading"
            className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("alternatives")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("noAlternative")}
          </p>
          <Link
            href={localizedHref(locale, "wines")}
            className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            {t("exploreAll")}
          </Link>
        </section>
      )}

      {recommended.length > 0 && similar.length > 0 ? (
        <section
          aria-labelledby="similar-heading"
          className="mt-16 border-t border-border/60 pt-16"
        >
          <h2
            id="similar-heading"
            className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("similar")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("similarIntro")}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <WineCard key={item.id} wine={item} minValueScore={null} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="pages-heading" className="mt-16">
        <h2
          id="pages-heading"
          className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
        >
          {t("pages")}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {programmaticLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-border/70 bg-card px-5 py-4 transition-all hover:border-wine/30 hover:shadow-sm"
            >
              <span className="font-medium text-foreground group-hover:text-wine">
                {link.label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-wine" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
