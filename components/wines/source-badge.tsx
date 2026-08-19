"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocale } from "next-intl";

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
  const locale = useLocale();
  const resolvedSource =
    source === "surse publice" && locale === "en" ? "public sources" : source;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {locale === "en" ? "Factual data from" : "Date factuale din"}{" "}
            {resolvedSource}
          </span>
          {lastUpdated ? (
            <span className="text-[10px] opacity-70">• {lastUpdated}</span>
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm leading-relaxed">
        <p>
          {locale === "en"
            ? `Factual details such as name, price, grape varieties, and availability come from ${resolvedSource}. Scores, editorial descriptions, and recommendations are original VinIntel.ro content.`
            : `Datele factuale (nume, pret, soiuri, disponibilitate) sunt preluate din ${resolvedSource}. Scorurile, descrierea editoriala si recomandarile sunt originale VinIntel.ro.`}
        </p>
        {details ? <p className="mt-2 opacity-90">{details}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}
