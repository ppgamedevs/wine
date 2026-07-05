import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { WineCard } from "@/components/wine-card";
import { buildProgrammaticLinks } from "@/lib/wine-analysis";
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

  return (
    <>
      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading" className="border-t border-border/60 pt-16">
          <h2
            id="similar-heading"
            className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            Vinuri similare
          </h2>
          <p className="mt-3 text-muted-foreground">
            Din aceeasi crama sau regiune, cu profil asemanator.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <WineCard key={item.id} wine={item} minValueScore={null} />
            ))}
          </div>
        </section>
      ) : null}

      {recommended.length > 0 ? (
        <section aria-labelledby="recommended-heading" className="mt-16">
          <h2
            id="recommended-heading"
            className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            Recomandari VinIntel
          </h2>
          <p className="mt-3 text-muted-foreground">
            Alternative cu Value Score de cel putin 75/100 in acelasi interval de
            pret.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((item) => (
              <WineCard key={item.id} wine={item} />
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
    </>
  );
}
