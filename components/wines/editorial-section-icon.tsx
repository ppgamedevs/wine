import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

interface EditorialSectionIconProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
}

export function EditorialSectionIcon({
  icon: Icon,
  className,
}: EditorialSectionIconProps) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        "border border-wine/25 bg-gradient-to-br from-wine/[0.08] via-background to-wine/[0.12]",
        "shadow-[0_1px_2px_rgba(124,45,18,0.08)] ring-1 ring-wine/15",
        className,
      )}
    >
      <Icon className="h-5 w-5 text-wine" aria-hidden="true" />
    </span>
  );
}
