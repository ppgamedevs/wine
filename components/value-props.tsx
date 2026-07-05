import type { ComponentType, SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import {
  MarketingPairingIcon,
  MarketingPriceIcon,
  MarketingRegionIcon,
  MarketingValueIcon,
} from "@/components/marketing-icons";
import { cn } from "@/lib/utils";

interface ValueItem {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const values: ValueItem[] = [
  {
    title: "Value Score real",
    description:
      "Un scor onest de la 0 la 100 care arata cat de bun e vinul pentru banii ceruti. Fara marketing, doar valoare reala.",
    icon: MarketingValueIcon,
  },
  {
    title: "Pairing-uri romanesti",
    description:
      "Asocieri gandite pentru mancarea de aici: sarmale, mici, ciorba de burta, friptura de porc sau cozonac.",
    icon: MarketingPairingIcon,
  },
  {
    title: "Preturi actuale",
    description:
      "Afisam pretul curent sau estimativ in RON, preluat din sursa principala a vinului.",
    icon: MarketingPriceIcon,
  },
  {
    title: "Date locale",
    description:
      "Informatii despre crame, soiuri autohtone si regiuni romanesti, adunate intr-un singur loc clar si rapid.",
    icon: MarketingRegionIcon,
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
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-xl",
                        "border border-wine/25 bg-gradient-to-br from-wine/[0.08] via-background to-wine/[0.12]",
                        "text-wine shadow-sm ring-1 ring-wine/10 transition-colors",
                        "group-hover:border-wine/40 group-hover:from-wine group-hover:to-wine/90 group-hover:text-wine-foreground",
                      )}
                    >
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
