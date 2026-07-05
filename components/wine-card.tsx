"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { WineImage } from "@/components/wines/wine-image";
import { WineCardPriceFooter } from "@/components/wines/wine-price-display";
import { valueScoreTone, wineTypeLabel } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

export function WineCard({
  wine,
  priority = false,
}: {
  wine: WineWithRelations;
  priority?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-wine/30 hover:shadow-xl"
    >
      <div className="relative">
        <WineImage
          slug={wine.slug}
          name={wine.name}
          type={wine.type}
          imageUrl={wine.imageUrl}
          imageSource={wine.imageSource}
          imageAlt={wine.imageAlt}
          vintage={wine.vintage}
          wineryName={wine.winery?.name}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          aspectClassName="relative aspect-[4/3] overflow-hidden bg-secondary/30"
        />

        <span className="absolute left-3 top-3 z-10 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
          {wineTypeLabel[wine.type]}
          {wine.vintage ? ` ${wine.vintage}` : ""}
        </span>

        {wine.valueScore !== null && wine.valueScore !== undefined ? (
          <span
            className={cn(
              "absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
              valueScoreTone(wine.valueScore),
            )}
            title="Value Score"
          >
            {wine.valueScore}
            <span className="opacity-70">/100</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {wine.winery?.name ? <span>{wine.winery.name}</span> : null}
          {wine.region?.name ? (
            <>
              <span aria-hidden="true">.</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {wine.region.name}
              </span>
            </>
          ) : null}
        </div>

        <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug text-foreground">
          <Link
            href={`/wines/${wine.slug}`}
            className="transition-colors hover:text-wine"
          >
            {wine.name}
          </Link>
        </h3>

        <WineCardPriceFooter wine={wine} />
      </div>
    </motion.article>
  );
}
