"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { resolveWineImage } from "@/lib/wine-images";
import { cn } from "@/lib/utils";
import type { WineType } from "@/types";
import { WineImageFallback } from "@/components/wines/wine-image-fallback";

interface WineImageProps {
  slug: string;
  name: string;
  type: WineType;
  imageUrl?: string | null;
  imageSource?: string | null;
  imageAlt?: string | null;
  vintage?: number | null;
  wineryName?: string | null;
  priority?: boolean;
  sizes: string;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  /** Use contain for product shots (cards); cover for hero/editorial crops. */
  objectFit?: "cover" | "contain";
  /** Tailwind padding classes when objectFit is contain. Defaults to p-5. */
  containPaddingClass?: string;
  /** Hero uses centered bottle layout; card/catalog uses fill + contain. */
  variant?: "default" | "hero";
}

export function WineImage({
  slug,
  name,
  type,
  imageUrl,
  imageSource,
  imageAlt,
  vintage,
  wineryName,
  priority = false,
  sizes,
  className,
  imageClassName,
  aspectClassName = "relative aspect-[4/3] overflow-hidden",
  objectFit = "cover",
  containPaddingClass = "p-5",
  variant = "default",
}: WineImageProps) {
  const [failed, setFailed] = useState(false);
  const { src, alt, fromExternalSource, unoptimized } = resolveWineImage({
    slug,
    imageUrl,
    imageSource,
    imageAlt,
    name,
    vintage,
    type,
    winery: wineryName ? { name: wineryName } : null,
  });

  const showFallback = !src || failed;
  const isHero = variant === "hero";
  const heroExternal = isHero && fromExternalSource;

  return (
    <div
      className={cn(
        aspectClassName,
        isHero && "overflow-hidden rounded-3xl",
        isHero &&
          (heroExternal
            ? "bg-white shadow-[0_28px_70px_-36px_rgba(15,15,15,0.22)]"
            : "border border-border/50 bg-gradient-to-b from-[#faf6f0] via-[#f3ede4] to-[#ebe2d6] shadow-[0_20px_50px_-24px_rgba(124,45,18,0.35)] ring-1 ring-wine/10"),
        className,
      )}
    >
      {showFallback ? (
        <WineImageFallback type={type} />
      ) : isHero ? (
        <motion.div
          className="relative h-full w-full overflow-hidden"
          whileHover={{ scale: 1.008 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-[14%] bottom-3 z-[2] h-5 rounded-[100%] blur-lg",
              heroExternal ? "bg-black/[0.07]" : "bg-black/[0.08]",
            )}
          />
          <div
            className={cn(
              "absolute inset-0",
              heroExternal
                ? "bottom-2 left-1 right-1 top-4 sm:bottom-3 sm:left-2 sm:right-2 sm:top-5"
                : "inset-x-5 bottom-5 top-7 sm:inset-x-7",
            )}
          >
            <Image
              src={src}
              alt={alt}
              fill
              priority={priority}
              sizes={sizes}
              unoptimized={unoptimized}
              onError={() => setFailed(true)}
              className={cn(
                "object-contain transition-transform duration-700",
                heroExternal
                  ? "origin-center scale-[1.02] object-center sm:scale-[1.04]"
                  : "origin-bottom object-bottom",
                !heroExternal && imageClassName,
              )}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          className={cn(
            "relative h-full w-full",
            objectFit === "contain" && containPaddingClass,
          )}
          whileHover={{ scale: objectFit === "contain" ? 1.02 : 1.03 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            unoptimized={unoptimized}
            onError={() => setFailed(true)}
            className={cn(
              "transition-transform duration-700",
              objectFit === "contain"
                ? "object-contain object-center"
                : "object-cover object-center",
              imageClassName,
            )}
          />
          {fromExternalSource ? (
            <span className="absolute bottom-2 right-2 z-10 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
              Sursa
            </span>
          ) : null}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </motion.div>
      )}
    </div>
  );
}
