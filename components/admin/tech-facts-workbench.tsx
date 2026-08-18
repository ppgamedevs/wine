import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WineTechRecovery } from "@/lib/tech-facts/recover";

const TECH_FILTERS = [
  { id: "missing-alcohol", label: "Fara alcool", code: "TECH_FIELD_PROVENANCE_MISSING" },
  { id: "unsourced", label: "Stocat fara sursa", code: "TECH_EXISTING_VALUE_UNSOURCED" },
  { id: "conflict", label: "Conflict sursa", code: "TECH_ALCOHOL_CONFLICT" },
  { id: "vintage", label: "Vintage mismatch", code: "TECH_VINTAGE_SOURCE_MISMATCH" },
  { id: "pdf", label: "PDF invalid", code: "TECH_WRONG_PDF_DOCUMENT" },
  { id: "review", label: "Revizuire umana", code: "TECH_UNIT_AMBIGUOUS" },
] as const;

export function TechFactsFilters({
  counts,
}: {
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TECH_FILTERS.map((filter) => (
        <ButtonLink
          key={filter.id}
          href={`/admin/data-quality?code=${filter.code}`}
          label={`${filter.label} (${counts[filter.code] ?? 0})`}
        />
      ))}
    </div>
  );
}

function ButtonLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs text-foreground hover:bg-muted"
    >
      {label}
    </Link>
  );
}

export function TechFactsWorkbench({
  recoveries,
}: {
  recoveries: WineTechRecovery[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vin</TableHead>
            <TableHead>Alcool</TableHead>
            <TableHead>Aciditate</TableHead>
            <TableHead>Zahar</TableHead>
            <TableHead>Stare</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recoveries.map((row) => (
            <TableRow key={row.wineId}>
              <TableCell className="font-medium">
                <Link className="underline" href={`/admin/wines?wineId=${row.wineId}`}>
                  {row.slug}
                </Link>
              </TableCell>
              {(["alcohol", "acidity", "sugar"] as const).map((field) => {
                const item = row.fields.find((entry) => entry.field === field);
                return (
                  <TableCell key={field} className="text-xs text-muted-foreground">
                    <div>Stocat: {item?.stored ?? "lipsa"}</div>
                    <div>Candidate: {item?.candidate ?? "n/a"}</div>
                    <div>{item?.candidateClass}</div>
                    {item?.claims[0]?.sourceUrl ? (
                      <a
                        className="underline"
                        href={item.claims[0].sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        sursa
                      </a>
                    ) : null}
                  </TableCell>
                );
              })}
              <TableCell>
                <Badge variant="outline">{row.wineClass}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
