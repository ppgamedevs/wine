"use client";

import { Heart, ExternalLink, Wine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRon, wineTypeLabel } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { ChatWineRecommendation } from "@/lib/sommelier-chat-types";
import {
  isFavoriteSlug,
  toggleFavoriteSlug,
} from "@/lib/sommelier-favorites";
import { cn } from "@/lib/utils";

export function ChatWineCard({
  wine,
  index = 0,
}: {
  wine: ChatWineRecommendation;
  index?: number;
}) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    setFavorited(isFavoriteSlug(wine.slug));

    const sync = () => setFavorited(isFavoriteSlug(wine.slug));
    window.addEventListener("vinintel-favorites-changed", sync);
    return () => window.removeEventListener("vinintel-favorites-changed", sync);
  }, [wine.slug]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: EASE_OUT }}
      className="overflow-hidden rounded-2xl border border-wine/15 bg-card shadow-sm"
    >
      <div className="flex gap-4 p-4">
        <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary/60">
          {wine.imageUrl ? (
            <Image
              src={wine.imageUrl}
              alt={wine.imageAlt}
              width={64}
              height={96}
              className="h-full w-full object-contain p-1"
              unoptimized
            />
          ) : (
            <Wine className="h-8 w-8 text-wine/40" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-wine">
            {wine.wineryName ?? "Crama"} · {wineTypeLabel[wine.type]}
          </p>
          <h3 className="mt-0.5 font-serif text-lg font-semibold leading-tight text-foreground">
            {wine.name}
            {wine.vintage ? ` ${wine.vintage}` : ""}
          </h3>
          <p className="mt-1 text-sm font-medium text-foreground/80">
            {formatRon(wine.priceRon)}
            {wine.valueScore != null ? (
              <span className="ml-2 font-normal text-muted-foreground">
                · Value {wine.valueScore}/100
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/60 bg-secondary/20 px-4 py-3">
        <Button
          asChild
          size="sm"
          className="bg-wine text-wine-foreground hover:bg-wine/90"
        >
          <Link href={`/wines/${wine.slug}`}>Vezi detalii</Link>
        </Button>

        {wine.purchaseUrl ? (
          <Button asChild size="sm" variant="outline">
            <a
              href={wine.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              {wine.purchaseLabel ?? "Cumpara"}
              <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "ml-auto",
            favorited && "text-wine hover:text-wine",
          )}
          onClick={() => setFavorited(toggleFavoriteSlug(wine.slug))}
        >
          <Heart
            className={cn("h-4 w-4", favorited && "fill-current")}
            aria-hidden="true"
          />
          {favorited ? "Salvat" : "Adauga la favorite"}
        </Button>
      </div>
    </motion.article>
  );
}
