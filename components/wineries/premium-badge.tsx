import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function PremiumBadge({ className, size = "md" }: PremiumBadgeProps) {
  return (
    <Badge
      className={cn(
        "gap-1 border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-wine/10 to-amber-500/10 font-medium text-amber-900 hover:from-amber-500/20 dark:text-amber-100",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      <Crown
        className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")}
        aria-hidden="true"
      />
      Premium
    </Badge>
  );
}
