import { Wine as WineIcon } from "lucide-react";
import { wineTypeGradient } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WineType } from "@/types";

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
