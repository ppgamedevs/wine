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

  return (
    <div className={cn(aspectClassName, className)}>
      {showFallback ? (
        <WineImageFallback type={type} />
      ) : isHero ? (
        <motion.div
          className="relative flex h-full w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10"
          whileHover={{ scale: 1.015 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={src}
            alt={alt}
            width={480}
            height={640}
            priority={priority}
            sizes={sizes}
            unoptimized={unoptimized}
            onError={() => setFailed(true)}
            className={cn(
              "h-auto max-h-[min(58vh,480px)] w-auto max-w-[78%] object-contain object-center transition-transform duration-700 sm:max-w-[72%]",
              fromExternalSource && "mix-blend-multiply",
              imageClassName,
            )}
          />
          {fromExternalSource ? (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur">
              Sursa
            </span>
          ) : null}
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
