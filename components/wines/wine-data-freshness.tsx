import { Clock } from "lucide-react";
import { formatLongDate } from "@/lib/format";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { WineWithRelations } from "@/types";

function resolveFreshness(wine: WineWithRelations): {
  date: string | undefined;
  isPriceDate: boolean;
} {
  const history = wine.priceHistory ?? [];
  if (history.length > 0) {
    const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest?.date) {
      return { date: formatLongDate(latest.date), isPriceDate: true };
    }
  }
  return { date: formatLongDate(wine.updatedAt), isPriceDate: false };
}

export function WineDataFreshness({ wine }: { wine: WineWithRelations }) {
  const pricing = buildWinePriceViewModel(wine);
  const freshness = resolveFreshness(wine);

  if (!freshness.date) return null;

  return (
    <section
      aria-label="Actualizare pagină și preț"
      className="rounded-2xl border border-border/70 bg-secondary/20 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-wine" aria-hidden="true" />
        <div className="text-sm text-muted-foreground">
          <p>
            {freshness.isPriceDate
              ? pricing.isVerifiedRecent
                ? "Preț verificat"
                : "Preț actualizat"
              : "Pagina a fost actualizată"}{" "}
            la{" "}
            <span className="font-medium text-foreground">
              {freshness.date}
            </span>
            .
          </p>
          {pricing.status === "estimated" ? (
            <p className="mt-1">
              Prețul afișat este estimativ. Confirmă sursa înainte de cumpărare.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
