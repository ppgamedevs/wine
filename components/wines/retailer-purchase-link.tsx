"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectRetailerLabel } from "@/lib/retailer-links";
import { cn } from "@/lib/utils";

interface RetailerPurchaseLinkProps {
  url: string;
  retailerName?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  showNote?: boolean;
  note?: string;
  className?: string;
  onTrackClick?: () => void;
}

export function RetailerPurchaseLink({
  url,
  retailerName,
  label = "Vezi oferta",
  size = "default",
  variant = "default",
  showNote = false,
  note,
  className,
  onTrackClick,
}: RetailerPurchaseLinkProps) {
  const retailer = detectRetailerLabel(url) ?? retailerName;

  if (!showNote) {
    return (
      <Button
        asChild
        size={size}
        variant={variant}
        className={cn(
          variant === "default" &&
            "bg-wine text-wine-foreground hover:bg-wine/90",
          className,
        )}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => onTrackClick?.()}
        >
          {label}
          <ExternalLink className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </a>
      </Button>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Button
        asChild
        size={size}
        variant={variant}
        className={cn(
          variant === "default" &&
            "bg-wine text-wine-foreground hover:bg-wine/90",
        )}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => onTrackClick?.()}
        >
          {label}
          <ExternalLink className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </a>
      </Button>
      {showNote ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {note ??
            (retailer
              ? `Deschidem pagina produsului pe ${retailer}, într-un tab nou. Comanda se finalizează direct la magazin.`
              : "Deschidem pagina produsului într-un tab nou. Comanda se finalizează direct la magazin.")}
        </p>
      ) : null}
    </div>
  );
}
