"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceBadgeProps {
  source?: string;
  lastUpdated?: string;
  details?: string;
}

export function SourceBadge({
  source = "surse publice",
  lastUpdated,
  details,
}: SourceBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Date factuale din {source}</span>
          {lastUpdated ? (
            <span className="text-[10px] opacity-70">• {lastUpdated}</span>
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm leading-relaxed">
        <p>
          Datele factuale (nume, pret, soiuri, disponibilitate) sunt preluate din{" "}
          {source}. Scorurile, descrierea editoriala si recomandarile sunt
          originale VinIntel.ro.
        </p>
        {details ? <p className="mt-2 opacity-90">{details}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}
