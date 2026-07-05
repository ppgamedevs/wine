"use client";

import type { ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  FlaskConical,
  Lightbulb,
  Share2,
  Sparkles,
  Thermometer,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { WineImage } from "@/components/wines/wine-image";
import { RetailerPurchaseLink } from "@/components/wines/retailer-purchase-link";
import { Button } from "@/components/ui/button";
import {
  formatRon,
  valueScoreTone,
  wineTypeLabel,
} from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { ExpertRecommendationDisplay } from "@/types";
import { cn } from "@/lib/utils";

const budgetLabel = {
  under: "Sub buget",
  ideal: "In buget",
  over: "Peste buget",
} as const;

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-wine">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </div>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

export function ExpertRecommendationCard({
  recommendation,
  rank,
  index = 0,
}: {
  recommendation: ExpertRecommendationDisplay;
  rank: number;
  index?: number;
}) {
  const { wine, matchScore, whyThisWine, thingsYouShouldKnow, pairingScience, servingAndStorage, budgetFit } =
    recommendation;
  const pricing = buildWinePriceViewModel(wine);

  const handleShare = async () => {
    const text = `${wine.name}: ${whyThisWine}`;
    if (navigator.share) {
      await navigator.share({
        title: `VinIntel - ${wine.name}`,
        text,
        url: `${window.location.origin}/wines/${wine.slug}`,
      });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: EASE_OUT }}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:border-wine/30 hover:shadow-lg sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-40">
          <WineImage
            slug={wine.slug}
            name={wine.name}
            type={wine.type}
            imageUrl={wine.imageUrl}
            imageSource={wine.imageSource}
            vintage={wine.vintage}
            wineryName={wine.winery?.name}
            sizes="(max-width: 640px) 100vw, 160px"
            aspectClassName="relative h-full min-h-44 w-full overflow-hidden"
          />
          <span className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-wine text-sm font-bold text-wine-foreground shadow">
            {rank}
          </span>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{wineTypeLabel[wine.type]}</span>
                {wine.winery?.name ? (
                  <>
                    <span aria-hidden="true">.</span>
                    <span>{wine.winery.name}</span>
                  </>
                ) : null}
              </div>
              <h3 className="mt-1 font-serif text-xl font-semibold text-foreground">
                <Link
                  href={`/wines/${wine.slug}`}
                  className="transition-colors hover:text-wine"
                >
                  {wine.name}
                  {wine.vintage ? (
                    <span className="text-muted-foreground"> {wine.vintage}</span>
                  ) : null}
                </Link>
              </h3>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wine/10 px-3 py-1 text-sm font-semibold text-wine">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {matchScore}% potrivire
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            {whyThisWine}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-lg font-semibold text-foreground">
              {formatRon(wine.priceAvg)}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                budgetFit === "over"
                  ? "bg-gold/15 text-gold"
                  : "bg-wine/10 text-wine",
              )}
            >
              {budgetLabel[budgetFit]}
            </span>
            {wine.valueScore !== null && wine.valueScore !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  valueScoreTone(wine.valueScore),
                )}
              >
                Value {wine.valueScore}/100
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Section icon={Lightbulb} title="Ce ar trebui sa stii">
          <ul className="space-y-1.5">
            {thingsYouShouldKnow.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-wine" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={FlaskConical} title="Stiinta pairing-ului">
          {pairingScience}
        </Section>

        <Section icon={Thermometer} title="Servire si pastrare">
          {servingAndStorage}
        </Section>

        {wine.expertNotes?.valueInsight ? (
          <Section icon={BookOpen} title="Insight de valoare">
            {wine.expertNotes.valueInsight}
          </Section>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <Button
          asChild
          size="sm"
          className="bg-wine text-wine-foreground hover:bg-wine/90"
        >
          <Link href={`/wines/${wine.slug}`}>
            Vezi fisa completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        {pricing.purchaseLink ? (
          <RetailerPurchaseLink
            url={pricing.purchaseLink.url}
            retailerName={pricing.purchaseLink.retailer}
            size="sm"
            variant="outline"
          />
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground hover:text-wine"
          onClick={() => void handleShare()}
        >
          <Share2 className="h-4 w-4" />
          Distribuie
        </Button>
      </div>
    </motion.article>
  );
}
