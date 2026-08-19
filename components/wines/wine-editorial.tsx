import type { ComponentType, ReactNode, SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EditorialSectionIcon } from "@/components/wines/editorial-section-icon";
import {
  EditorialInsightIcon,
  EditorialTasteIcon,
  EditorialWineIcon,
} from "@/components/wines/editorial-icons";
import { sanitizeEditorialText } from "@/lib/editorial-text";
import { sanitizePublicSecondaryCopy } from "@/lib/scoring-v2/public-secondary-display";
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

export function WineEditorial({ wine }: { wine: WineWithRelations }) {
  const publicEditorialText = (text: string | null | undefined) =>
    sanitizeEditorialText(sanitizePublicSecondaryCopy(text, wine));
  const hasDescription = Boolean(wine.descriptionEditorial?.trim());
  const hasThings = (wine.thingsYouShouldKnow ?? []).length > 0;
  const hasTaste = Boolean(wine.tasteProfile?.trim());

  const hasEditorialContent = hasDescription || hasThings || hasTaste;

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
            {publicEditorialText(wine.descriptionEditorial)}
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
            {publicEditorialText(wine.tasteProfile)}
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
            {(wine.thingsYouShouldKnow ?? []).map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 text-sm leading-relaxed text-foreground/90"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine"
                  aria-hidden="true"
                />
                {publicEditorialText(item)}
              </li>
            ))}
          </ul>
        </EditorialBlock>
      ) : null}

    </div>
  );
}
