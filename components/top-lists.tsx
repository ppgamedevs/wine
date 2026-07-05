import { Reveal } from "@/components/reveal";
import { TopListGrid } from "@/components/top-list-grid";

export function TopLists() {
  return (
    <section className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            Topuri si ghiduri
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Cele mai cautate selectii de vinuri romanesti, gata sa te ajute sa
            alegi rapid.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <TopListGrid />
        </Reveal>
      </div>
    </section>
  );
}
