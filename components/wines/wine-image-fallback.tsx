import { Wine as WineIcon } from "lucide-react";
import { getWineTypeLabel, wineTypeGradient } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WineType } from "@/types";
import { useLocale } from "next-intl";

export function WineImageFallback({
  type,
  className,
  iconClassName = "h-12 w-12",
  showLabel = true,
}: {
  type: WineType;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
}) {
  const locale = useLocale();
  const lightLabel = type !== "red";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br",
        wineTypeGradient[type],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45) 0%, transparent 45%), radial-gradient(circle at 70% 80%, rgba(124,45,18,0.12) 0%, transparent 50%)",
        }}
      />
      <div
        aria-hidden="true"
        className={cn(
          "relative flex items-center justify-center rounded-full border border-wine/15 bg-background/20 p-5 shadow-inner backdrop-blur-sm",
          lightLabel ? "text-wine/35" : "text-wine-foreground/70",
        )}
      >
        <WineIcon className={iconClassName} />
      </div>
      {showLabel ? (
        <p
          className={cn(
            "relative mt-3 text-xs font-medium uppercase tracking-wider",
            lightLabel ? "text-wine/45" : "text-wine-foreground/60",
          )}
        >
          {getWineTypeLabel(type, locale)}
        </p>
      ) : null}
    </div>
  );
}
