import type { ComponentType, SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import {
  MarketingPairingIcon,
  MarketingPriceIcon,
  MarketingRegionIcon,
  MarketingValueIcon,
} from "@/components/marketing-icons";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";
import { cn } from "@/lib/utils";

interface ValueItem {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export async function ValueProps() {
  const { t } = await getDiscoveryI18n();
  const values: ValueItem[] = [
    {
      title: t("ValueProps.items.value.title"),
      description: t("ValueProps.items.value.description"),
      icon: MarketingValueIcon,
    },
    {
      title: t("ValueProps.items.pairing.title"),
      description: t("ValueProps.items.pairing.description"),
      icon: MarketingPairingIcon,
    },
    {
      title: t("ValueProps.items.price.title"),
      description: t("ValueProps.items.price.description"),
      icon: MarketingPriceIcon,
    },
    {
      title: t("ValueProps.items.local.title"),
      description: t("ValueProps.items.local.description"),
      icon: MarketingRegionIcon,
    },
  ];

  return (
    <section className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            {t("ValueProps.heading")}
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            {t("ValueProps.description")}
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
