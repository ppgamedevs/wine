import Link from "next/link";
import { formatRon } from "@/lib/format";
import { buildWorthItAnalysis } from "@/lib/wine-analysis";
import type { WineWithRelations } from "@/types";

interface TopListWineVerdictProps {
  wine: WineWithRelations;
  position: number;
}

function buildWhyInTop(wine: WineWithRelations): string {
  const parts: string[] = [];
  if (wine.valueScore && wine.valueScore >= 75) {
    parts.push(`Value Score ${wine.valueScore}/100`);
  }
  if (wine.vintage && wine.vintage >= 2022) {
    parts.push(`vintage ${wine.vintage}`);
  }
  if (wine.priceAvg) {
    parts.push(`pret bun la ${formatRon(wine.priceAvg)}`);
  }
  return parts.length > 0
    ? parts.join(", ")
    : "raport calitate-pret solid in catalogul nostru";
}

function buildMinus(wine: WineWithRelations): string | null {
  if (!wine.priceAvg) return "pret indisponibil momentan";
  if (wine.overpricedRisk === "high") return "risc moderat de suprapret";
  if (wine.alcohol && wine.alcohol >= 14.5) return "alcool relativ ridicat";
  if ((wine.availability ?? []).length === 0) return "disponibilitate limitata";
  return null;
}

export function TopListWineVerdict({ wine, position }: TopListWineVerdictProps) {
  const pairing = wine.foodPairings?.[0]?.dish;
  const minus = buildMinus(wine);
  const worthIt = buildWorthItAnalysis(wine);

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm font-semibold text-wine">#{position}</span>
          <h3 className="mt-1 font-serif text-lg font-semibold text-foreground">
            <Link href={`/wines/${wine.slug}`} className="hover:text-wine">
              {wine.name}
              {wine.vintage ? ` ${wine.vintage}` : ""}
            </Link>
          </h3>
          {wine.winery?.name ? (
            <p className="mt-1 text-sm text-muted-foreground">{wine.winery.name}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-right font-semibold text-foreground">
          {formatRon(wine.priceAvg)}
        </p>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-foreground">De ce e in top</dt>
          <dd className="text-muted-foreground">{buildWhyInTop(wine)}</dd>
        </div>
        {pairing ? (
          <div>
            <dt className="font-medium text-foreground">Potrivit pentru</dt>
            <dd className="text-muted-foreground">{pairing.toLowerCase()}</dd>
          </div>
        ) : null}
        {minus ? (
          <div>
            <dt className="font-medium text-foreground">Minus</dt>
            <dd className="text-muted-foreground">{minus}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium text-foreground">Verdict</dt>
          <dd className="text-muted-foreground">{worthIt.headline}</dd>
        </div>
      </dl>
    </article>
  );
}

export function TopListQuickAnswer({
  wines,
}: {
  wines: WineWithRelations[];
}) {
  const top5 = wines.slice(0, 5);

  return (
    <section aria-labelledby="quick-answer-heading">
      <h2
        id="quick-answer-heading"
        className="font-serif text-2xl font-semibold text-foreground"
      >
        Raspuns rapid: top 5 vinuri romanesti
      </h2>
      <p className="mt-2 text-muted-foreground">
        Cele mai bune optiuni acum, cu pret in RON si motivul alegerii.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {top5.map((wine, index) => (
          <TopListWineVerdict key={wine.id} wine={wine} position={index + 1} />
        ))}
      </div>
    </section>
  );
}
