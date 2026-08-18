import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { WineCard } from "@/components/wine-card";
import { buildProgrammaticLinks } from "@/lib/wine-analysis";
import { VALUE_SCORE_NEUTRAL_MIN } from "@/lib/value-score-thresholds";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { WineWithRelations } from "@/types";

interface WineRelatedSectionsProps {
  wine: WineWithRelations;
  similar: WineWithRelations[];
  recommended: WineWithRelations[];
}

export function WineRelatedSections({
  wine,
  similar,
  recommended,
}: WineRelatedSectionsProps) {
  const programmaticLinks = buildProgrammaticLinks(wine);
  const pricing = buildWinePriceViewModel(wine);
  const alternatives = recommended.length > 0 ? recommended : similar;
  const alternativeIntro =
    pricing.purchaseLink == null
      ? "Nu avem momentan o ofertă verificată. Poți continua cu aceste opțiuni similare."
      : (wine.valueScore ?? 0) < VALUE_SCORE_NEUTRAL_MIN
        ? "Alternative mai bune la bani similari, din același tip de vin."
        : "Opțiuni din același tip de vin și dintr-un interval de preț apropiat.";

  return (
    <div id="alternative" className="scroll-mt-24">
      {alternatives.length > 0 ? (
        <section aria-labelledby="recommended-heading">
          <h2
            id="recommended-heading"
            className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            Ce poți cumpăra în loc
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
            Ce poți cumpăra în loc
          </h2>
          <p className="mt-3 text-muted-foreground">
            Nu avem încă o alternativă suficient de apropiată pentru această
            sticlă.
          </p>
          <Link
            href="/vinuri"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Explorează toate vinurile
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
            Alte vinuri similare
          </h2>
          <p className="mt-3 text-muted-foreground">
            Din aceeași cramă sau regiune, cu profil apropiat.
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
          Pagini similare
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
