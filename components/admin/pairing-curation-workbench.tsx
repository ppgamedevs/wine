"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveCuratedPairingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { CurationCard } from "@/lib/pairing-curation-cards";
import { basisProvenanceLabel } from "@/lib/curated-evidence";
import { previewCurationImpact } from "@/lib/pairing-curation-preview";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type { FoodPairingStrength } from "@/lib/schema";

interface PairingCurationWorkbenchProps {
  cards: CurationCard[];
  initialIndex?: number;
}

export function PairingCurationWorkbench({
  cards,
  initialIndex = 0,
}: PairingCurationWorkbenchProps) {
  const router = useRouter();
  const [index, setIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(cards.length - 1, 0)),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const card = cards[index];
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<
    Record<string, { dish: string; rationale: string; strength: FoodPairingStrength }>
  >({});

  const selectedDrafts = useMemo(() => {
    if (!card) return [];
    return card.drafts
      .filter((draft) => selected[`${card.slug}:${draft.dish}`] !== false)
      .filter((draft) => selected[`${card.slug}:${draft.dish}`] === true)
      .map((draft) => {
        const edit = edits[`${card.slug}:${draft.dish}`];
        if (!edit) return draft;
        return {
          ...draft,
          dish: edit.dish,
          rationale: edit.rationale,
          strength: edit.strength,
          basis: draft.basis.includes("editorial_judgment")
            ? draft.basis
            : [...draft.basis, "editorial_judgment" as const],
        } satisfies PairingDraft;
      });
  }, [card, edits, selected]);

  const selectedImpact = useMemo(() => {
    if (!card) return null;
    return previewCurationImpact(card.previewWine, selectedDrafts);
  }, [card, selectedDrafts]);

  if (!card || !selectedImpact) {
    return <p className="text-sm text-muted-foreground">Nu exista vinuri in lot.</p>;
  }

  function toggle(dish: string) {
    const key = `${card.slug}:${dish}`;
    setSelected((current) => ({ ...current, [key]: !(current[key] === true) }));
  }

  function approveSelected() {
    if (selectedDrafts.length === 0) {
      setMessage("Selecteaza cel putin o asociere.");
      return;
    }
    startTransition(async () => {
      const result = await approveCuratedPairingsAction({
        wineId: card.id,
        drafts: selectedDrafts,
      });
      setMessage(result.ok ? result.message : result.error);
      if (result.ok) {
        router.refresh();
        setIndex((current) => Math.min(current + 1, cards.length - 1));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Vin {index + 1} / {cards.length}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIndex((current) => Math.min(cards.length - 1, current + 1))}
          >
            Urmatorul
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={approveSelected}>
            Aproba selectia
          </Button>
        </div>
      </div>

      <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Nu aproba asocieri doar pentru a creste scorul. Impactul este doar diagnostic.
      </p>
      {message ? <p className="text-sm text-foreground">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border p-4">
          <h2 className="font-serif text-xl font-semibold">{card.name}</h2>
          <p className="text-sm text-muted-foreground">
            {card.winery} · {card.vintage ?? "n/a"} · {card.type} · {card.sweetness ?? "n/a"}
          </p>
          <p className="text-sm">Soiuri: {card.grapes.join(", ") || "n/a"}</p>
          <p className="text-sm">
            Pret {card.priceAvg ?? "n/a"} · Value {card.valueScore ?? "n/a"}
          </p>
          <p className="text-sm">
            Alcool {card.alcohol ?? "n/a"} · Aciditate {card.acidity ?? "n/a"} · Zahar{" "}
            {card.sugar ?? "n/a"}
          </p>
          <Link className="text-sm text-wine underline" href={`/wines/${card.slug}`}>
            Pagina publica
          </Link>
        </div>
        <div className="space-y-2 rounded-xl border border-border p-4">
          <h3 className="font-medium">Impact Food v2 (doar in memorie)</h3>
          <p className="text-sm">
            Acum: Food {selectedImpact.currentFood.score} · C{" "}
            {selectedImpact.currentFood.confidence} · {selectedImpact.currentFood.level}
          </p>
          <p className="text-sm">
            Dupa selectie: Food {selectedImpact.predictedFood.score} · C{" "}
            {selectedImpact.predictedFood.confidence} · {selectedImpact.predictedFood.level}
          </p>
          <p className="text-xs text-muted-foreground">
            Provenienta: {selectedImpact.predictedFood.provenance}. Strength nu schimba
            evidenta.
          </p>
          {selectedImpact.evidenceUpliftWarning ? (
            <p className="text-sm text-amber-800">{selectedImpact.evidenceUpliftWarning}</p>
          ) : null}
          <ul className="text-sm text-muted-foreground">
            {selectedImpact.occasions.map((row) => (
              <li key={row.occasion}>
                {row.occasion}: {row.before} → {row.after}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="font-medium">Recomandarea producatorului</h3>
        {card.producerCulinary ? (
          <p className="mt-2 text-sm">{card.producerCulinary}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Fara evidenta culinara oficiala.</p>
        )}
        <ul className="mt-3 space-y-2 text-sm">
          {card.producerClaims.map((claim) => (
            <li key={`${claim.category}-${claim.dish}`}>
              {claim.category}: {claim.dish} · {claim.sourceType} · conf {claim.confidence}
              {claim.sourceUrl ? ` · ${claim.sourceUrl}` : ""}
              <div className="text-muted-foreground">{claim.excerpt}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="font-medium">Asocieri VinIntel existente</h3>
        {card.existingPairings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Niciuna.</p>
        ) : (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {card.existingPairings.map((pairing) => (
              <li key={pairing.dish}>
                {pairing.dish}
                {pairing.source ? ` (${pairing.source})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">Propuneri (draft, nu sunt curate)</h3>
        {card.warnings.map((warning) => (
          <p key={warning} className="text-sm text-amber-800">
            {warning}
          </p>
        ))}
        {card.drafts.map((draft) => {
          const key = `${card.slug}:${draft.dish}`;
          const edit = edits[key] ?? {
            dish: draft.dish,
            rationale: draft.rationale,
            strength: draft.strength,
          };
          const checked = selected[key] === true;
          return (
            <label key={key} className="block rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(draft.dish)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <input
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                    value={edit.dish}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [key]: { ...edit, dish: event.target.value },
                      }))
                    }
                  />
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                    rows={2}
                    value={edit.rationale}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [key]: { ...edit, rationale: event.target.value },
                      }))
                    }
                  />
                  <p className="text-xs">
                    Sursa editoriala: Recomandare VinIntel
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baza evidentei: {basisProvenanceLabel(draft.basis)} (blocata)
                  </p>
                  <label className="block text-xs text-muted-foreground">
                    Strength recomandare
                    <select
                      className="ml-2 rounded-md border border-border bg-background px-2 py-1"
                      value={edit.strength}
                      onChange={(event) =>
                        setEdits((current) => ({
                          ...current,
                          [key]: {
                            ...edit,
                            strength: event.target.value as FoodPairingStrength,
                          },
                        }))
                      }
                    >
                      <option value="possible">possible</option>
                      <option value="good">good</option>
                      <option value="strong">strong</option>
                    </select>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {draft.category} · propunere {draft.confidence}
                    {draft.styleOnlyWarning ? " · doar stil general" : ""}
                  </p>
                </div>
              </div>
            </label>
          );
        })}
      </section>
    </div>
  );
}
