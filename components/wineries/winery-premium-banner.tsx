import Image from "next/image";
import { resolveWineryBannerUrl } from "@/lib/winery-premium";
import type { Winery } from "@/types";

interface WineryPremiumBannerProps {
  winery: Pick<Winery, "isPremium" | "customBannerUrl" | "name">;
  alt: string;
}

export function WineryPremiumBanner({
  winery,
  alt,
}: WineryPremiumBannerProps) {
  const bannerUrl = resolveWineryBannerUrl(winery);
  if (!bannerUrl) return null;

  return (
    <div className="relative aspect-[21/9] w-full overflow-hidden border-b border-border/60 bg-secondary/30 sm:aspect-[3/1]">
      <Image
        src={bannerUrl}
        alt={alt}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
