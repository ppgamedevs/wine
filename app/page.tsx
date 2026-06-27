import Link from "next/link";
import { Suspense } from "react";
import { FeaturedWines, FeaturedWinesSkeleton } from "@/components/featured-wines";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TopLists } from "@/components/top-lists";
import { ValueProps } from "@/components/value-props";
import { Button } from "@/components/ui/button";
import { buildFaqJsonLd, type FaqEntry } from "@/lib/seo";

export const revalidate = 3600;

const homeFaq: FaqEntry[] = [
  {
    question: "Ce este VinIntel?",
    answer:
      "VinIntel este un ghid inteligent al vinurilor romanesti. Oferim recomandari clare si oneste, cu un Value Score care masoara raportul calitate-pret, pairing-uri pentru mancarea romaneasca si un somelier AI care tine cont de buget, ocazie si preferinte.",
  },
  {
    question: "Ce inseamna Value Score?",
    answer:
      "Value Score este un indicator de la 0 la 100 care arata cat de bun este un vin raportat la pretul cerut. Un scor peste 85 inseamna un raport calitate-pret excelent.",
  },
  {
    question: "Cum gasesc un vin pentru o anumita mancare sau ocazie?",
    answer:
      "Foloseste somelierul AI: alegi bugetul in RON, ocazia (de exemplu sarmale, gratar, cadou sau cina romantica) si preferintele, iar tu primesti instant 3 pana la 5 recomandari potrivite, cu explicatii.",
  },
  {
    question: "Preturile sunt in RON si actualizate?",
    answer:
      "Da. Toate preturile sunt afisate in RON, ca preturi medii urmarite in magazine din Romania si actualizate periodic.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildFaqJsonLd(homeFaq)} id="home-faq" />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ValueProps />

        <Suspense fallback={<FeaturedWinesSkeleton />}>
          <FeaturedWines />
        </Suspense>

        <TopLists />

        <section className="py-20" aria-labelledby="home-faq-heading">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal className="text-center">
              <h2
                id="home-faq-heading"
                className="font-serif text-3xl font-semibold text-foreground sm:text-4xl"
              >
                Intrebari frecvente
              </h2>
              <p className="mt-4 text-balance text-muted-foreground">
                Ce trebuie sa stii despre VinIntel si cum te ajutam sa alegi.
              </p>
            </Reveal>
            <div className="mt-10 space-y-3">
              {homeFaq.map((item, index) => (
                <Reveal key={item.question} delay={index * 0.05}>
                  <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
                    <h3 className="font-medium text-foreground">
                      {item.question}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-wine/20 bg-wine px-8 py-14 text-center text-wine-foreground sm:px-14">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-20"
                >
                  <div className="absolute right-[-4rem] top-[-4rem] h-64 w-64 rounded-full bg-gold/40 blur-3xl" />
                </div>
                <h2 className="font-serif text-3xl font-bold sm:text-4xl">
                  Nu stii ce vin sa alegi?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-balance text-wine-foreground/85">
                  Spune-i somelierului AI ce gatesti, ce buget ai si pentru ce
                  ocazie. Primesti o recomandare clara in cateva secunde.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-8 bg-cream text-wine hover:bg-cream/90"
                >
                  <Link href="/ai-sommelier">Intreaba somelierul AI</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
