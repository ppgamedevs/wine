import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildRetailerPurchaseLabel,
  detectRetailerLabel,
} from "@/lib/retailer-links";
import { cn } from "@/lib/utils";

interface RetailerPurchaseLinkProps {
  url: string;
  retailerName?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  showNote?: boolean;
  className?: string;
}

export function RetailerPurchaseLink({
  url,
  retailerName,
  size = "default",
  variant = "default",
  showNote = false,
  className,
}: RetailerPurchaseLinkProps) {
  const label = buildRetailerPurchaseLabel(url, retailerName);
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
        <a href={url} target="_blank" rel="noopener noreferrer sponsored">
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
        <a href={url} target="_blank" rel="noopener noreferrer sponsored">
          {label}
          <ExternalLink className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </a>
      </Button>
      {showNote ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {retailer
            ? `Deschidem pagina produsului pe ${retailer}, intr-un tab nou. Comanda se finalizeaza direct la magazin.`
            : "Deschidem pagina produsului intr-un tab nou. Comanda se finalizeaza direct la magazin."}
        </p>
      ) : null}
    </div>
  );
}
