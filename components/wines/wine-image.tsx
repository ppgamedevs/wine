"use client";

import { motion } from "framer-motion";
import { Wine as WineIcon } from "lucide-react";
import Image from "next/image";
import { wineTypeGradient } from "@/lib/format";
import { resolveWineImage } from "@/lib/wine-images";
import { cn } from "@/lib/utils";
import type { WineType } from "@/types";

interface WineImageProps {
  slug: string;
  name: string;
  type: WineType;
  imageUrl?: string | null;
  imageAlt?: string | null;
  vintage?: number | null;
  wineryName?: string | null;
  priority?: boolean;
  sizes: string;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
}

export function WineImage({
  slug,
  name,
  type,
  imageUrl,
  imageAlt,
  vintage,
  wineryName,
  priority = false,
  sizes,
  className,
  imageClassName,
  aspectClassName = "relative aspect-[4/3] overflow-hidden",
}: WineImageProps) {
  const { src, alt } = resolveWineImage({
    slug,
    imageUrl,
    imageAlt,
    name,
    vintage,
    type,
    winery: wineryName ? { name: wineryName } : null,
  });

  return (
    <div className={cn(aspectClassName, className)}>
      <motion.div
        className="relative h-full w-full"
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn(
            "object-cover transition-transform duration-700",
            imageClassName,
          )}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </motion.div>
    </div>
  );
}

export function WineImageFallback({
  type,
  className,
  iconClassName = "h-14 w-14",
}: {
  type: WineType;
  className?: string;
  iconClassName?: string;
}) {
  const lightLabel = type !== "red";
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br",
        wineTypeGradient[type],
        className,
      )}
    >
      <WineIcon
        className={cn(
          iconClassName,
          lightLabel ? "text-wine/40" : "text-wine-foreground/80",
        )}
        aria-hidden="true"
      />
    </div>
  );
}
