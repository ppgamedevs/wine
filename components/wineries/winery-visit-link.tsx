"use client";

import { ExternalLink, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackWineryEvent } from "@/lib/winery-analytics-client";

export interface WineryVisitLinkCopy {
  visit: string;
  unavailable: string;
}

interface WineryVisitLinkProps {
  winerySlug: string;
  visitUrl: string;
  verified: boolean;
  trackAnalytics: boolean;
  copy: WineryVisitLinkCopy;
}

export function WineryVisitLink({
  winerySlug,
  visitUrl,
  verified,
  trackAnalytics,
  copy,
}: WineryVisitLinkProps) {
  if (!verified) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          disabled
          className="pointer-events-none opacity-50"
          aria-disabled="true"
        >
          <Ticket className="h-4 w-4" aria-hidden="true" />
          {copy.visit}
        </Button>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {copy.unavailable}
        </p>
      </>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      className="border-wine/30 text-wine hover:bg-wine/5"
    >
      <a
        href={visitUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          if (trackAnalytics) {
            void trackWineryEvent(winerySlug, "visit_click");
          }
        }}
      >
        <Ticket className="h-4 w-4" aria-hidden="true" />
        {copy.visit}
        <ExternalLink
          className="h-3.5 w-3.5 opacity-70"
          aria-hidden="true"
        />
      </a>
    </Button>
  );
}
