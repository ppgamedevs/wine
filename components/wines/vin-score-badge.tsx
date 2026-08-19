import { getVinScoreMeta } from "@/lib/format";
import { cn } from "@/lib/utils";

interface VinScoreBadgeProps {
  score: number;
  size?: "md" | "lg";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function VinScoreBadge({
  score,
  size = "md",
  showLabel = true,
  label,
  className,
}: VinScoreBadgeProps) {
  const meta = getVinScoreMeta(score);

  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-2xl font-bold ring-2",
          meta.badgeClass,
          meta.ringClass,
          size === "lg" ? "px-5 py-3 text-3xl" : "px-3 py-1.5 text-lg",
        )}
      >
        {score}
        <span
          className={cn(
            "ml-1 font-medium opacity-80",
            size === "lg" ? "text-base" : "text-sm",
          )}
        >
          /100
        </span>
      </span>
      {showLabel ? (
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label ?? meta.label}
        </span>
      ) : null}
    </div>
  );
}
