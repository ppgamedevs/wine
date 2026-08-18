import { CheckCircle2, XCircle } from "lucide-react";
import { buildWineProsCons } from "@/lib/wine-analysis";
import type { PublicTechnicalTrust } from "@/lib/tech-facts/public-trust";
import type { WineWithRelations } from "@/types";

export function WineProsCons({
  wine,
  technicalTrust,
}: {
  wine: WineWithRelations;
  technicalTrust: PublicTechnicalTrust;
}) {
  const { pros, cons } = buildWineProsCons(wine, technicalTrust);

  if (pros.length === 0 && cons.length === 0) return null;

  return (
    <section aria-labelledby="pros-cons-heading">
      <h2
        id="pros-cons-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Puncte forte si slabe
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-600/30 bg-emerald-50/50 p-5 dark:bg-emerald-950/20">
          <h3 className="flex items-center gap-2 font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Puncte forte
          </h3>
          <ul className="mt-3 space-y-2">
            {pros.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <h3 className="flex items-center gap-2 font-medium text-foreground">
            <XCircle className="h-4 w-4 text-destructive" />
            Puncte slabe
          </h3>
          <ul className="mt-3 space-y-2">
            {cons.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
