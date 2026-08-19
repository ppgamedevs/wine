import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  resolveTopListDefinitionById,
  topListSlugForLocale,
  type TopListCanonicalId,
} from "@/lib/i18n/top-list-routes";
import { getPseoMessages } from "@/lib/i18n/pseo";
import {
  BUDGET_THRESHOLDS,
  filterWinesByBudget,
  filterWinesByType,
  getTopWinesByValue,
} from "@/lib/top-lists";
import { formatRon } from "@/lib/format";
import type { WineType, WineWithRelations } from "@/types";

interface TopListHubSectionsProps {
  allWines: WineWithRelations[];
}

const COLOR_SECTIONS: {
  type: WineType;
  label: Record<AppLocale, string>;
}[] = [
  { type: "red", label: { ro: "Rosii", en: "Red wines" } },
  { type: "white", label: { ro: "Albe", en: "White wines" } },
  { type: "rose", label: { ro: "Roze", en: "Rosé wines" } },
  { type: "sparkling", label: { ro: "Spumante", en: "Sparkling wines" } },
];

const OCCASION_LINKS = [
  {
    id: "curated:best-wines-for-gifts",
    label: { ro: "Cadou", en: "Gifts" },
  },
  {
    id: "budget-occasion:50:cina-romantica",
    label: { ro: "Cina romantica", en: "Romantic dinners" },
  },
  {
    id: "budget-occasion:50:gratar",
    label: { ro: "Gratar", en: "Barbecues" },
  },
  {
    id: "budget-occasion:50:sarmale",
    label: { ro: "Sarmale", en: "Sarmale" },
  },
] as const satisfies ReadonlyArray<{
  id: TopListCanonicalId;
  label: Record<AppLocale, string>;
}>;

function topListHref(locale: AppLocale, canonicalId: TopListCanonicalId): string {
  const definition = resolveTopListDefinitionById(canonicalId);
  if (!definition) {
    throw new Error(`Missing top-list definition: ${canonicalId}`);
  }
  return localizedHref(locale, "topWine", {
    slug: topListSlugForLocale(definition, locale),
  });
}

function MiniTopList({
  title,
  wines,
  href,
  locale,
}: {
  title: string;
  wines: WineWithRelations[];
  href: string;
  locale: AppLocale;
}) {
  if (wines.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-foreground">{title}</h3>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-wine hover:underline"
        >
          {getPseoMessages(locale).common.viewAll}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ol className="mt-4 space-y-2">
        {wines.slice(0, 3).map((wine, index) => (
          <li key={wine.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{index + 1}.</span>
            <Link
              href={localizedHref(locale, "wine", { slug: wine.slug })}
              className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-wine"
            >
              {wine.name}
            </Link>
            <span className="shrink-0 text-muted-foreground">
              {formatRon(wine.priceAvg, locale)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TopListHubSections({
  allWines,
  locale,
}: TopListHubSectionsProps & { locale: AppLocale }) {
  const copy = getPseoMessages(locale).topLists;
  const budgetSections = BUDGET_THRESHOLDS.filter((b) =>
    [30, 50, 100, 150].includes(b),
  );

  return (
    <>
      <section aria-labelledby="budget-sections-heading" className="space-y-6">
        <h2
          id="budget-sections-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {copy.budgetHeading}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {budgetSections.map((budget) => (
            <MiniTopList
              key={budget}
              title={
                locale === "en"
                  ? `Under ${budget} RON`
                  : `Sub ${budget} lei`
              }
              wines={getTopWinesByValue(filterWinesByBudget(allWines, budget), 3)}
              href={topListHref(locale, `budget:${budget}`)}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="color-sections-heading" className="space-y-6">
        <h2
          id="color-sections-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {copy.colorHeading}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COLOR_SECTIONS.map(({ type, label }) => (
            <MiniTopList
              key={type}
              title={label[locale]}
              wines={getTopWinesByValue(filterWinesByType(allWines, type), 3)}
              href={topListHref(locale, `type:${type}`)}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="occasion-sections-heading" className="space-y-6">
        <h2
          id="occasion-sections-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {copy.occasionHeading}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {OCCASION_LINKS.map((item) => (
            <Link
              key={item.id}
              href={topListHref(locale, item.id)}
              className="group flex items-center justify-between rounded-xl border border-border/70 bg-card px-5 py-4 transition-all hover:border-wine/30"
            >
              <span className="font-medium text-foreground group-hover:text-wine">
                {item.label[locale]}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-wine" />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="methodology-heading" className="space-y-4">
        <h2
          id="methodology-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {copy.methodologyHeading}
        </h2>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          <p>{copy.methodology}</p>
          <p className="mt-3">
            <Link
              href={localizedHref(locale, "howScoresWork")}
              className="font-medium text-wine hover:underline"
            >
              {copy.scoresLink}
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="limitations-heading" className="space-y-4">
        <h2
          id="limitations-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {copy.limitationsHeading}
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {copy.limitations.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="text-sm text-muted-foreground">
          {copy.updated}:{" "}
          <time dateTime={new Date().toISOString()}>
            {new Date().toLocaleDateString(locale === "en" ? "en-GB" : "ro-RO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </p>
      </section>
    </>
  );
}
