import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { WineCard } from "@/components/wine-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFeaturedWines } from "@/lib/queries";

export function FeaturedWinesSkeleton() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-40" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function FeaturedWines() {
  const featured = await getFeaturedWines(8);

  if (featured.length === 0) return null;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
                Vinuri recomandate
              </h2>
              <p className="mt-3 text-muted-foreground">
                Selectia noastra dupa Value Score: cel mai bun raport calitate
                pret din vinul romanesc.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 border-wine/30 text-wine hover:bg-wine/10 hover:text-wine"
            >
              <Link href="/vinuri">
                Toate vinurile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((wine, index) => (
            <Reveal key={wine.id} delay={(index % 4) * 0.06} className="h-full">
              <WineCard wine={wine} priority={index < 4} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
