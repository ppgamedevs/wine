"use client";

import { Building2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type WineryLogoSize = "card" | "hero" | "inline";

interface WineryLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: WineryLogoSize;
  priority?: boolean;
  className?: string;
}

const SIZE_CONFIG: Record<
  WineryLogoSize,
  { container: string; sizes: string; icon: string; padding: string }
> = {
  card: {
    container: "h-[3.25rem] w-[5.25rem] rounded-xl",
    sizes: "84px",
    icon: "h-6 w-6",
    padding: "p-1",
  },
  hero: {
    container: "h-[5.25rem] w-[8.75rem] rounded-2xl sm:h-24 sm:w-40",
    sizes: "160px",
    icon: "h-9 w-9",
    padding: "p-1.5 sm:p-2",
  },
  inline: {
    container: "h-14 w-[4.5rem] rounded-xl",
    sizes: "72px",
    icon: "h-6 w-6",
    padding: "p-1",
  },
};

export function WineryLogo({
  name,
  logoUrl,
  size = "card",
  priority = false,
  className,
}: WineryLogoProps) {
  const [failed, setFailed] = useState(false);
  const config = SIZE_CONFIG[size];
  const showLogo = Boolean(logoUrl?.trim()) && !failed;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-border/50 bg-white shadow-[0_8px_24px_-16px_rgba(124,45,18,0.28)] ring-1 ring-black/[0.04]",
        config.container,
        className,
      )}
    >
      {showLogo ? (
        <Image
          src={logoUrl!.trim()}
          alt={name}
          fill
          priority={priority}
          sizes={config.sizes}
          className={cn("object-contain object-center", config.padding)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-wine/[0.06] text-wine">
          <Building2 className={config.icon} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
