import { Clock } from "lucide-react";
import { formatLongDate } from "@/lib/format";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { WineWithRelations } from "@/types";

function resolveVerifiedDate(wine: WineWithRelations): string | undefined {
  const history = wine.priceHistory ?? [];
  if (history.length > 0) {
    const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest?.date) {
      return formatLongDate(latest.date);
    }
  }
  return formatLongDate(wine.updatedAt);
}

export function WineDataFreshness({ wine }: { wine: WineWithRelations }) {
  const pricing = buildWinePriceViewModel(wine);
  const verifiedDate = resolveVerifiedDate(wine);

  if (!verifiedDate) return null;

  return (
    <section
      aria-label="Actualizare date"
      className="rounded-2xl border border-border/70 bg-secondary/20 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-wine" aria-hidden="true" />
        <div className="text-sm text-muted-foreground">
          <p>
            {pricing.isVerifiedRecent ? "Pret verificat" : "Date actualizate"} la{" "}
            <span className="font-medium text-foreground">{verifiedDate}</span>.
          </p>
          {pricing.status === "estimated" ? (
            <p className="mt-1">
              Pretul afisat este estimativ. Confirma sursa inainte de cumparare.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
