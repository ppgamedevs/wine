import Link from "next/link";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  resolveTopListDefinitionById,
  topListSlugForLocale,
} from "@/lib/i18n/top-list-routes";
import { getPseoMessages } from "@/lib/i18n/pseo";
import {
  filterWinesByBudget,
  filterWinesByType,
  getTopWinesByValue,
  sortWinesByGiftRanking,
} from "@/lib/top-lists";
import { formatRon } from "@/lib/format";
import type { WineWithRelations } from "@/types";

interface BudgetPageSectionsProps {
  allWines: WineWithRelations[];
  budget: number;
  locale: AppLocale;
}

function WineMiniRow({
  wine,
  rank,
  locale,
}: {
  wine: WineWithRelations;
  rank: number;
  locale: AppLocale;
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="text-wine font-semibold">{rank}.</span>
      <Link
        href={localizedHref(locale, "wine", { slug: wine.slug })}
        className="min-w-0 flex-1 truncate font-medium hover:text-wine"
      >
        {wine.name}
      </Link>
      <span className="shrink-0 text-muted-foreground">
        {formatRon(wine.priceAvg, locale)}
      </span>
    </li>
  );
}

export function BudgetPageSections({
  allWines,
  budget,
  locale,
}: BudgetPageSectionsProps) {
  if (budget !== 50) return null;
  const copy = getPseoMessages(locale).topLists;
  const supermarketDefinition = resolveTopListDefinitionById(
    "curated:best-supermarket-wines",
  );
  if (!supermarketDefinition) {
    throw new Error("Missing supermarket top-list definition");
  }
  const supermarketHref = localizedHref(locale, "topWine", {
    slug: topListSlugForLocale(supermarketDefinition, locale),
  });

  const under25 = getTopWinesByValue(filterWinesByBudget(allWines, 25), 3, false);
  const under30 = getTopWinesByValue(filterWinesByBudget(allWines, 30), 3, false);
  const redCheap = getTopWinesByValue(
    filterWinesByType(filterWinesByBudget(allWines, 50), "red"),
    3,
  );
  const whiteCheap = getTopWinesByValue(
    filterWinesByType(filterWinesByBudget(allWines, 50), "white"),
    3,
  );
  const giftCheap = getTopWinesByValue(
    sortWinesByGiftRanking(filterWinesByBudget(allWines, 50)),
    3,
    false,
  );

  return (
    <section
      aria-labelledby="budget-extra-heading"
      className="min-w-0 space-y-8"
    >
      <h2
        id="budget-extra-heading"
        className="font-serif text-2xl font-semibold text-foreground"
      >
        {copy.cheapGuide}
      </h2>

      <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
        {under25.length > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <h3 className="font-serif text-lg font-semibold">
              {locale === "en" ? "Best under 25 RON" : "Cel mai bun sub 25 lei"}
            </h3>
            <ol className="mt-3 space-y-2">
              {under25.map((w, i) => (
                <WineMiniRow key={w.id} wine={w} rank={i + 1} locale={locale} />
              ))}
            </ol>
          </div>
        ) : null}

        {under30.length > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <h3 className="font-serif text-lg font-semibold">
              {locale === "en" ? "Best under 30 RON" : "Cel mai bun sub 30 lei"}
            </h3>
            <ol className="mt-3 space-y-2">
              {under30.map((w, i) => (
                <WineMiniRow key={w.id} wine={w} rank={i + 1} locale={locale} />
              ))}
            </ol>
          </div>
        ) : null}

        {redCheap.length > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <h3 className="font-serif text-lg font-semibold">
              {locale === "en" ? "Best affordable red" : "Cel mai bun rosu ieftin"}
            </h3>
            <ol className="mt-3 space-y-2">
              {redCheap.map((w, i) => (
                <WineMiniRow key={w.id} wine={w} rank={i + 1} locale={locale} />
              ))}
            </ol>
          </div>
        ) : null}

        {whiteCheap.length > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <h3 className="font-serif text-lg font-semibold">
              {locale === "en" ? "Best affordable white" : "Cel mai bun alb ieftin"}
            </h3>
            <ol className="mt-3 space-y-2">
              {whiteCheap.map((w, i) => (
                <WineMiniRow key={w.id} wine={w} rank={i + 1} locale={locale} />
              ))}
            </ol>
          </div>
        ) : null}

        {giftCheap.length > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <h3 className="font-serif text-lg font-semibold">
              {locale === "en" ? "Affordable wines for gifts" : "Vinuri ieftine pentru cadou"}
            </h3>
            <ol className="mt-3 space-y-2">
              {giftCheap.map((w, i) => (
                <WineMiniRow key={w.id} wine={w} rank={i + 1} locale={locale} />
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/70 bg-secondary/20 p-6">
        <h3 className="font-serif text-lg font-semibold text-foreground">
          {copy.avoidHeading}
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {copy.avoidItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-4 text-sm">
          <Link href={supermarketHref} className="font-medium text-wine hover:underline">
            {copy.supermarketLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
