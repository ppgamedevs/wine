import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  BUDGET_THRESHOLDS,
  filterWinesByBudget,
  filterWinesByType,
  getTopWinesByValue,
  WINE_TYPE_TO_TOP_SLUG,
} from "@/lib/top-lists";
import { formatRon } from "@/lib/format";
import type { WineType, WineWithRelations } from "@/types";

interface TopListHubSectionsProps {
  allWines: WineWithRelations[];
}

const COLOR_SECTIONS: { type: WineType; label: string }[] = [
  { type: "red", label: "Rosii" },
  { type: "white", label: "Albe" },
  { type: "rose", label: "Roze" },
  { type: "sparkling", label: "Spumante" },
];

const OCCASION_LINKS = [
  { slug: "vinuri-cadou", label: "Cadou" },
  { slug: "vinuri-sub-50-lei-pentru-cina-romantica", label: "Cina romantica" },
  { slug: "vinuri-sub-50-lei-pentru-gratar", label: "Gratar" },
  { slug: "vinuri-sub-50-lei-pentru-sarmale", label: "Sarmale" },
];

function MiniTopList({
  title,
  wines,
  href,
}: {
  title: string;
  wines: WineWithRelations[];
  href: string;
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
          Vezi tot
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ol className="mt-4 space-y-2">
        {wines.slice(0, 3).map((wine, index) => (
          <li key={wine.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{index + 1}.</span>
            <Link
              href={`/wines/${wine.slug}`}
              className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-wine"
            >
              {wine.name}
            </Link>
            <span className="shrink-0 text-muted-foreground">
              {formatRon(wine.priceAvg)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TopListHubSections({ allWines }: TopListHubSectionsProps) {
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
          Cele mai bune pe bugete
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {budgetSections.map((budget) => (
            <MiniTopList
              key={budget}
              title={`Sub ${budget} lei`}
              wines={getTopWinesByValue(filterWinesByBudget(allWines, budget), 3)}
              href={`/topuri/vinuri-sub-${budget}-lei`}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="color-sections-heading" className="space-y-6">
        <h2
          id="color-sections-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          Cele mai bune dupa culoare
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COLOR_SECTIONS.map(({ type, label }) => (
            <MiniTopList
              key={type}
              title={label}
              wines={getTopWinesByValue(filterWinesByType(allWines, type), 3)}
              href={`/topuri/vinuri-${WINE_TYPE_TO_TOP_SLUG[type]}`}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="occasion-sections-heading" className="space-y-6">
        <h2
          id="occasion-sections-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          Cele mai bune dupa ocazie
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {OCCASION_LINKS.map((item) => (
            <Link
              key={item.slug}
              href={`/topuri/${item.slug}`}
              className="group flex items-center justify-between rounded-xl border border-border/70 bg-card px-5 py-4 transition-all hover:border-wine/30"
            >
              <span className="font-medium text-foreground group-hover:text-wine">
                {item.label}
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
          Cum am realizat clasamentul
        </h2>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Ordonam vinurile dupa Value Score (raport calitate-pret), pretul actual
            in RON, medalii si premii unde sunt disponibile, vintage-ul si
            disponibilitatea in magazine. Limitam numarul de vinuri de la aceeasi
            crama in top 5 ca sa nu dominam lista cu un singur producator.
          </p>
          <p className="mt-3">
            <Link href="/cum-functioneaza-scorurile" className="font-medium text-wine hover:underline">
              Cum calculam scorurile
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="limitations-heading" className="space-y-4">
        <h2
          id="limitations-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          Limitari
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Pretul poate varia in functie de retailer si promotii.</li>
          <li>Nu toate vinurile au fost degustate editorial de echipa VinIntel.</li>
          <li>Value Score nu este acelasi lucru cu un rating de recenzii utilizatori.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Actualizat la:{" "}
          <time dateTime={new Date().toISOString()}>
            {new Date().toLocaleDateString("ro-RO", {
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
