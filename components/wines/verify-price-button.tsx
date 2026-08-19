"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VerifyPriceButtonProps {
  url: string;
  enabled: boolean;
  size?: "sm" | "default";
  className?: string;
  label?: string;
  disabledTooltip?: string;
}

export function VerifyPriceButton({
  url,
  enabled,
  size = "sm",
  className,
  label = "Verifica pret",
  disabledTooltip = "disponibil doar pentru cramele verificate",
}: VerifyPriceButtonProps) {
  if (!enabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex cursor-not-allowed", className)}>
            <Button
              type="button"
              size={size}
              variant="outline"
              disabled
              tabIndex={-1}
              aria-disabled="true"
              className="pointer-events-none border-border/60 text-muted-foreground/70 opacity-60"
            >
              {label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      asChild
      size={size}
      variant="outline"
      className={cn(
        "border-wine/30 text-wine hover:bg-wine/10",
        className,
      )}
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </Button>
  );
}
