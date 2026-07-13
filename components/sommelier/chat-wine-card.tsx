"use client";

import { ShoppingBag, Wine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { VinScoreBadge } from "@/components/wines/vin-score-badge";
import { formatRon, wineTypeLabel } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { ChatWineRecommendation } from "@/lib/sommelier-chat-types";
import { buildWineFullTitle } from "@/lib/wine-vintage";
import { cn } from "@/lib/utils";

export function ChatWineCard({
  wine,
  index = 0,
}: {
  wine: ChatWineRecommendation;
  index?: number;
}) {
  const displayName = wine.vintage
    ? buildWineFullTitle(wine.name, wine.vintage)
    : wine.name;
  const purchaseHref = `/wines/${wine.slug}#price-heading`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: EASE_OUT }}
    >
      <Card
        size="sm"
        className={cn(
          "h-full overflow-hidden border-border/70 py-0 transition-all duration-300",
          "hover:border-wine/30 hover:shadow-lg",
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary/20">
          {wine.imageUrl ? (
            <Image
              src={wine.imageUrl}
              alt={wine.imageAlt}
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-contain p-3"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Wine className="h-10 w-10 text-wine/35" aria-hidden="true" />
            </div>
          )}

          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
            {wineTypeLabel[wine.type]}
          </span>
        </div>

        <CardContent className="space-y-3 pt-4">
          {wine.wineryName ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {wine.wineryName}
            </p>
          ) : null}

          <h3 className="font-serif text-lg font-semibold leading-snug text-foreground">
            {displayName}
          </h3>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm font-medium text-foreground/90">
              {formatRon(wine.priceRon)}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                pret aprox.
              </span>
            </p>

            {wine.valueScore != null ? (
              <VinScoreBadge score={wine.valueScore} size="md" showLabel={false} />
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="mt-auto flex flex-wrap gap-2 border-t border-border/60 bg-muted/30">
          <Button
            asChild
            size="sm"
            className="bg-wine text-wine-foreground hover:bg-wine/90"
          >
            <Link href={`/wines/${wine.slug}`}>Vezi detalii</Link>
          </Button>

          {wine.hasAffiliateLink ? (
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
              <Link href={purchaseHref}>
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Cumpara
              </Link>
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
