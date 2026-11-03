"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GrapeVarietyImageProps {
  slug: string;
  name: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSource?: string | null;
  priority?: boolean;
  className?: string;
}

function GrapeFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="sr-only">{label}</span>
      <svg
        viewBox="0 0 120 120"
        className="h-16 w-16 text-wine/45"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M58 17c-1 14 3 24 2 35"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M62 18c11-13 27-17 38-9-4 14-17 22-31 18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <g fill="currentColor" opacity="0.18">
          <circle cx="44" cy="56" r="12" />
          <circle cx="68" cy="53" r="13" />
          <circle cx="91" cy="60" r="11" />
          <circle cx="35" cy="75" r="11" />
          <circle cx="58" cy="74" r="13" />
          <circle cx="82" cy="79" r="12" />
          <circle cx="46" cy="94" r="11" />
          <circle cx="71" cy="95" r="12" />
          <circle cx="57" cy="108" r="10" />
        </g>
        <g stroke="currentColor" strokeWidth="1.4" opacity="0.7">
          <circle cx="44" cy="56" r="12" />
          <circle cx="68" cy="53" r="13" />
          <circle cx="91" cy="60" r="11" />
          <circle cx="35" cy="75" r="11" />
          <circle cx="58" cy="74" r="13" />
          <circle cx="82" cy="79" r="12" />
          <circle cx="46" cy="94" r="11" />
          <circle cx="71" cy="95" r="12" />
          <circle cx="57" cy="108" r="10" />
        </g>
      </svg>
    </div>
  );
}

export function GrapeVarietyImage({
  slug,
  name,
  imageUrl,
  imageAlt,
  imageSource,
  priority = false,
  className,
}: GrapeVarietyImageProps) {
  const [failed, setFailed] = useState(false);
  const alt = imageAlt?.trim() || `Ciorchine de struguri ${name}`;
  const src = imageUrl?.trim();

  return (
    <div
      className={cn(
        "relative aspect-square w-[5.5rem] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-[radial-gradient(circle_at_35%_25%,rgba(124,45,18,0.10),transparent_62%),linear-gradient(145deg,rgba(255,255,255,0.9),rgba(247,242,232,0.72))] sm:w-32",
        className,
      )}
      data-grape-slug={slug}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 88px, 128px"
          quality={85}
          className="object-contain p-1.5 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          onError={() => setFailed(true)}
        />
      ) : (
        <GrapeFallback label={alt} />
      )}
      {imageSource ? (
        <span className="sr-only">Sursa imaginii: {imageSource}</span>
      ) : null}
    </div>
  );
}
