import { ExternalLink, MapPin, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRon } from "@/lib/format";
import type { WineWithRelations } from "@/types";

export function WineAvailability({ wine }: { wine: WineWithRelations }) {
  const stores = wine.availability.length > 0 ? wine.availability : [];
  const affiliates = wine.affiliateLinks.length > 0 ? wine.affiliateLinks : [];

  return (
    <section aria-labelledby="availability-heading">
      <h2
        id="availability-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Unde il gasesti
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Preturi medii in magazine din Romania. Linkurile de cumparare sunt
        placeholder pana la activarea parteneriatelor affiliate.
      </p>

      {stores.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {stores.map((store) => (
            <Card key={store.retailer} className="border-border/70">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{store.retailer}</p>
                    <p className="text-sm text-muted-foreground">
                      {store.inStock ? "In stoc" : "Stoc variabil"}
                      {store.priceRon ? ` . ${formatRon(store.priceRon)}` : ""}
                    </p>
                  </div>
                </div>
                {store.url ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={store.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      Vezi
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6 border-dashed border-border">
          <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
            <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              Date de disponibilitate in curs de actualizare pentru acest vin.
            </p>
          </CardContent>
        </Card>
      )}

      {affiliates.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {affiliates.map((link) => (
            <Button
              key={link.retailer}
              asChild
              className="bg-wine text-wine-foreground hover:bg-wine/90"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
              >
                Cumpara de la {link.retailer}
                {link.priceRon ? ` . ${formatRon(link.priceRon)}` : ""}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled className="bg-wine/50 text-wine-foreground">
            Cumpara online (in curand)
          </Button>
          <Button asChild variant="outline">
            <Link href="/cauta">Cauta in magazine</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
