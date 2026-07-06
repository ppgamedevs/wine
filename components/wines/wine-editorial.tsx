import type { ComponentType, ReactNode, SVGProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EditorialSectionIcon } from "@/components/wines/editorial-section-icon";
import {
  EditorialDessertIcon,
  EditorialFoodMatchIcon,
  EditorialGiftIcon,
  EditorialInsightIcon,
  EditorialOccasionIcon,
  EditorialPairingIcon,
  EditorialTasteIcon,
  EditorialWineIcon,
} from "@/components/wines/editorial-icons";
import { getVinScoreMeta } from "@/lib/format";
import { sanitizeEditorialText } from "@/lib/editorial-text";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

function EditorialBlock({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <div className="flex items-center gap-3">
        <EditorialSectionIcon icon={Icon} />
        <h2
          id={id}
          className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
        >
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function pairingTone(score: number | undefined): string {
  if (score == null) return "bg-muted text-muted-foreground";
  return getVinScoreMeta(score).badgeClass;
}

export function WineEditorial({ wine }: { wine: WineWithRelations }) {
  const hasDescription = Boolean(wine.descriptionEditorial?.trim());
  const hasThings = wine.thingsYouShouldKnow.length > 0;
  const hasTaste = Boolean(wine.tasteProfile?.trim());
  const hasPairingNotes = wine.foodPairingNotes.length > 0;
  const hasDessertPairings = wine.dessertPairings.length > 0;
  const hasOccasions = wine.recommendedOccasions.length > 0;

  const hasEditorialContent =
    hasDescription ||
    hasThings ||
    hasTaste ||
    hasPairingNotes ||
    hasDessertPairings ||
    hasOccasions;

  return (
    <div className="space-y-12">
      {!hasEditorialContent ? (
        <Card className="border-dashed border-border/80 bg-secondary/20">
          <CardContent className="p-6 text-sm leading-relaxed text-muted-foreground">
            Analiza editoriala pentru acest vin este in pregatire. Datele
            factuale (pret, soiuri, crama) sunt afisate mai jos; scorurile
            VinIntel vor fi completate curand.
          </CardContent>
        </Card>
      ) : null}

      {hasDescription ? (
        <EditorialBlock
          id="wine-description-editorial"
          title="Despre acest vin"
          icon={EditorialWineIcon}
        >
          <p className="max-w-3xl text-base leading-relaxed text-foreground/90">
            {sanitizeEditorialText(wine.descriptionEditorial)}
          </p>
        </EditorialBlock>
      ) : null}

      {hasTaste ? (
        <EditorialBlock
          id="wine-taste-profile"
          title="Profil gustativ"
          icon={EditorialTasteIcon}
        >
          <p className="max-w-3xl text-base leading-relaxed text-foreground/90">
            {sanitizeEditorialText(wine.tasteProfile)}
          </p>
        </EditorialBlock>
      ) : null}

      {hasThings ? (
        <EditorialBlock
          id="wine-things-to-know"
          title="Ce ar trebui sa stii"
          icon={EditorialInsightIcon}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {wine.thingsYouShouldKnow.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 text-sm leading-relaxed text-foreground/90"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine"
                  aria-hidden="true"
                />
                {sanitizeEditorialText(item)}
              </li>
            ))}
          </ul>
        </EditorialBlock>
      ) : null}

      {hasPairingNotes ? (
        <EditorialBlock
          id="wine-pairing-notes"
          title="Pairing-uri recomandate"
          icon={EditorialPairingIcon}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {wine.foodPairingNotes.map((pairing) => (
              <Card
                key={pairing.dish}
                className="border-border/70 transition-colors hover:border-wine/30"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-foreground">
                      {pairing.dish}
                    </h3>
                    {pairing.score != null ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          pairingTone(pairing.score),
                        )}
                      >
                        {pairing.score}/100
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {sanitizeEditorialText(pairing.note)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </EditorialBlock>
      ) : null}

      {hasDessertPairings ? (
        <EditorialBlock
          id="wine-dessert-pairings"
          title="Pairing cu deserturi romanesti"
          icon={EditorialDessertIcon}
        >
          <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Sugestii VinIntel pentru dulciuri traditionale: cum aromele vinului
            echilibreaza zaharul si grasimea desertului.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {wine.dessertPairings.map((pairing) => (
              <Card
                key={pairing.dish}
                className="border-border/70 border-gold/20 bg-gold/5 transition-colors hover:border-wine/30"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-foreground">
                      {pairing.dish}
                    </h3>
                    {pairing.score != null ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          pairingTone(pairing.score),
                        )}
                      >
                        {pairing.score}/100
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {sanitizeEditorialText(pairing.note)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </EditorialBlock>
      ) : null}

      {hasOccasions ? (
        <EditorialBlock
          id="wine-occasions"
          title="Ocazii recomandate"
          icon={EditorialOccasionIcon}
        >
          <ul className="flex flex-wrap gap-2">
            {wine.recommendedOccasions.map((occasion) => (
              <li key={occasion}>
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-normal"
                >
                  {occasion}
                </Badge>
              </li>
            ))}
          </ul>
        </EditorialBlock>
      ) : null}
    </div>
  );
}
