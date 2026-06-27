import { Gauge, MapPin, TrendingUp, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";

interface ValueItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

const values: ValueItem[] = [
  {
    title: "Value Score real",
    description:
      "Un scor onest de la 0 la 100 care arata cat de bun e vinul pentru banii ceruti. Fara marketing, doar valoare reala.",
    icon: Gauge,
  },
  {
    title: "Pairing-uri romanesti",
    description:
      "Asocieri gandite pentru mancarea de aici: sarmale, mici, ciorba de burta, friptura de porc sau cozonac.",
    icon: UtensilsCrossed,
  },
  {
    title: "Preturi actuale",
    description:
      "Urmarim preturile in RON din mai multe magazine si iti aratam unde gasesti cel mai bun pret, actualizat.",
    icon: TrendingUp,
  },
  {
    title: "Date locale",
    description:
      "Informatii despre crame, soiuri autohtone si regiuni romanesti, adunate intr-un singur loc clar si rapid.",
    icon: MapPin,
  },
];

export function ValueProps() {
  return (
    <section className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            De ce merita
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Un ghid limpede al vinurilor romanesti, construit pentru viteza,
            claritate si incredere.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Reveal key={value.title} delay={index * 0.08} className="h-full">
                <Card className="group h-full border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-wine/30 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-wine/10 text-wine transition-colors group-hover:bg-wine group-hover:text-wine-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-serif text-xl font-semibold text-foreground">
                      {value.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
