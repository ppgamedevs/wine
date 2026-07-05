import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { formatRon, wineTypeLabel } from "@/lib/format";
import type { WineWithRelations } from "@/types";

const SWEETNESS_LABELS: Record<
  NonNullable<WineWithRelations["sweetness"]>,
  string
> = {
  sec: "Sec",
  demisec: "Demisec",
  demidulce: "Demidulce",
  dulce: "Dulce",
};

interface SpecRow {
  label: string;
  value: string;
}

function buildSpecs(wine: WineWithRelations): SpecRow[] {
  const grapeText = wine.grapeVarieties
    .map((g) =>
      g.percentage ? `${g.name} (${g.percentage}%)` : g.name,
    )
    .join(", ");

  const specs: SpecRow[] = [
    { label: "Tip vin", value: wineTypeLabel[wine.type] },
    ...(wine.sweetness
      ? [
          {
            label: "Dulceata",
            value: SWEETNESS_LABELS[wine.sweetness],
          },
        ]
      : []),
    wine.vintage
      ? { label: "An recolta", value: String(wine.vintage) }
      : { label: "An recolta", value: "N/A" },
    grapeText
      ? { label: "Soiuri", value: grapeText }
      : { label: "Soiuri", value: "N/A" },
    wine.region?.name
      ? { label: "Regiune", value: wine.region.name }
      : { label: "Regiune", value: "N/A" },
    wine.winery?.name
      ? { label: "Crama", value: wine.winery.name }
      : { label: "Crama", value: "N/A" },
    ...(wine.alcohol
      ? [{ label: "Alcool", value: `${wine.alcohol}% vol.` }]
      : []),
    ...(wine.sugar !== null && wine.sugar !== undefined
      ? [{ label: "Zahar rezidual", value: `${wine.sugar} g/L` }]
      : []),
    ...(wine.acidity !== null && wine.acidity !== undefined
      ? [{ label: "Aciditate", value: `${wine.acidity} g/L` }]
      : []),
    wine.priceAvg
      ? { label: "Pret mediu", value: formatRon(wine.priceAvg) }
      : { label: "Pret mediu", value: "N/A" },
    wine.cellarPotential
      ? {
          label: "Potential invechire",
          value: `pana la ${wine.cellarPotential} ani`,
        }
      : { label: "Potential invechire", value: "N/A" },
    wine.overpricedRisk
      ? {
          label: "Risc suprapret",
          value:
            wine.overpricedRisk === "low"
              ? "Scazut"
              : wine.overpricedRisk === "medium"
                ? "Moderat"
                : "Ridicat",
        }
      : { label: "Risc suprapret", value: "N/A" },
    {
      label: "Pentru incepatori",
      value: wine.beginnerFriendly ? "Da" : "Nu",
    },
  ];

  return specs;
}

export function WineSpecsTable({ wine }: { wine: WineWithRelations }) {
  const specs = buildSpecs(wine);

  return (
    <section aria-labelledby="specs-heading">
      <h2
        id="specs-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Specificatii tehnice
      </h2>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
        <Table>
          <TableBody>
            {specs.map((spec, index) => (
              <TableRow
                key={spec.label}
                className={index % 2 === 0 ? "bg-secondary/20" : undefined}
              >
                <TableCell className="w-2/5 py-3.5 pl-6 font-medium text-muted-foreground">
                  {spec.label}
                </TableCell>
                <TableCell className="py-3.5 pr-6 text-foreground">
                  {spec.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
