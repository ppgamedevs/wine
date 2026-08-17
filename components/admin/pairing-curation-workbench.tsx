"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveCuratedPairingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { CurationCard } from "@/lib/pairing-curation-cards";
import {
  basisProvenanceLabel,
  evidenceContextFromPairingFields,
} from "@/lib/curated-evidence";
import {
  RELATED_PRODUCER_NOTICE,
  resolveDraftProducerProvenance,
} from "@/lib/pairing/producer-provenance";
import {
  draftMatchesExistingPairing,
  isKnownPairingDish,
  partitionPairingDrafts,
  resolveFoodCategoryForDish,
} from "@/lib/pairing-curation-match";
import { previewCurationImpact } from "@/lib/pairing-curation-preview";
import {
  PAIRING_REVIEW_SKIP_STORAGE_KEY,
  addSkippedSlug,
  applyApprovedPairingsToCards,
  approvalSuccessMessage,
  canApproveCurationSelection,
  clearKeyedStateForSlug,
  FIRST_BATCH_COMPLETE_MESSAGE,
  FOUR_PAIRINGS_WARNING,
  NO_NEW_CURATION_DRAFTS_MESSAGE,
  UNKNOWN_DISH_CATEGORY_CARD_MESSAGE,
  pendingReviewSlugs,
  dishFromCurationError,
  reviewApprovedAtLabel,
  reviewPairingMeta,
  draftSelectionKey,
  mergeServerCardsPreserveOrder,
  nextReviewSlug,
  pairingCurationPath,
  parseSkippedSlugs,
  prevReviewSlug,
  resolveCurrentSlug,
  reviewCardStatus,
  reviewPosition,
  reviewProgress,
} from "@/lib/pairing-curation-review";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type { FoodPairingStrength } from "@/lib/schema";

interface PairingCurationWorkbenchProps {
  cards: CurationCard[];
  currentSlug?: string;
}

export function PairingCurationWorkbench({
  cards: serverCards,
  currentSlug,
}: PairingCurationWorkbenchProps) {
  const router = useRouter();
  const lockedSlugsRef = useRef(serverCards.map((card) => card.slug));
  const [localCards, setLocalCards] = useState(serverCards);
  const [activeSlug, setActiveSlug] = useState(
    resolveCurrentSlug(
      lockedSlugsRef.current,
      currentSlug ?? serverCards[0]?.slug,
    ),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error" | null>(
    null,
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [showCurated, setShowCurated] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [edits, setEdits] = useState<
    Record<string, { dish: string; rationale: string; strength: FoodPairingStrength }>
  >({});

  useEffect(() => {
    setSkipped(parseSkippedSlugs(window.sessionStorage.getItem(PAIRING_REVIEW_SKIP_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    setLocalCards((current) =>
      mergeServerCardsPreserveOrder(
        lockedSlugsRef.current,
        serverCards,
        current,
      ),
    );
  }, [serverCards]);

  useEffect(() => {
    const pending = pendingReviewSlugs(localCards, skipped);
    const next = resolveCurrentSlug(
      lockedSlugsRef.current,
      currentSlug,
      showCurated ? undefined : pending,
    );
    if (next) setActiveSlug(next);
  }, [currentSlug, localCards, showCurated, skipped]);

  useEffect(() => {
    if (messageKind !== "success" || !message) return;
    const timer = window.setTimeout(() => {
      setMessage(null);
      setMessageKind(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [message, messageKind]);

  const slugs = lockedSlugsRef.current;
  const card = localCards.find((item) => item.slug === activeSlug) ?? localCards[0];

  const { newDrafts } = useMemo(() => {
    if (!card) return { newDrafts: [] };
    return partitionPairingDrafts(card.drafts, card.existingPairings);
  }, [card]);

  const producerContext = useMemo(() => {
    if (!card) return null;
    return evidenceContextFromPairingFields({
      type: card.previewWine.type,
      sweetness: card.previewWine.sweetness,
      alcohol: card.previewWine.alcohol,
      acidity: card.previewWine.acidity,
      producerCulinaryPairings: card.previewWine.producerContent?.culinaryPairings,
      foodEvidence: card.previewWine.producerContent?.foodEvidence,
      culinaryLaundryRejected:
        card.previewWine.producerContent?.culinaryLaundryRejected,
      culinaryChromeRejected:
        card.previewWine.producerContent?.culinaryChromeRejected,
    });
  }, [card]);

  const selectedDrafts = useMemo(() => {
    if (!card || !producerContext) return [];
    return newDrafts
      .filter((draft) => selected[draftSelectionKey(card.slug, draft.dish)] === true)
      .map((draft) => {
        const edit = edits[draftSelectionKey(card.slug, draft.dish)];
        const edited: PairingDraft = edit
          ? {
              ...draft,
              dish: edit.dish,
              rationale: edit.rationale,
              strength: edit.strength,
              category: resolveFoodCategoryForDish(edit.dish, draft.category),
              basis: draft.basis.includes("editorial_judgment")
                ? draft.basis
                : [...draft.basis, "editorial_judgment" as const],
              originalDish: draft.dish,
              originalRationale: draft.rationale,
            }
          : draft;
        return resolveDraftProducerProvenance(edited, producerContext);
      })
      .filter((draft) => !draftMatchesExistingPairing(draft, card.existingPairings));
  }, [card, edits, newDrafts, producerContext, selected]);

  const selectedImpact = useMemo(() => {
    if (!card) return null;
    return previewCurationImpact(card.previewWine, selectedDrafts);
  }, [card, selectedDrafts]);

  const progress = reviewProgress(localCards, skipped);
  const pendingSlugs = pendingReviewSlugs(localCards, skipped);
  const status = card ? reviewCardStatus(card, skipped) : "pending";
  const position = card ? reviewPosition(slugs, card.slug) : 0;
  const batchComplete = progress.pending === 0 && progress.total > 0;
  const navSlugs = showCurated ? slugs : pendingSlugs.length > 0 ? pendingSlugs : slugs;

  if (!card || !selectedImpact) {
    return <p className="text-sm text-muted-foreground">Nu exista vinuri in lot.</p>;
  }

  function goTo(slug: string, options?: { keepMessage?: boolean }) {
    if (!options?.keepMessage) {
      setMessage(null);
      setMessageKind(null);
      setDraftErrors({});
    }
    setActiveSlug(slug);
    router.replace(pairingCurationPath(slug), { scroll: false });
  }

  function toggle(dish: string) {
    const key = draftSelectionKey(card.slug, dish);
    setSelected((current) => ({ ...current, [key]: !(current[key] === true) }));
  }

  function skipCurrent(reason: "skipped" | "later") {
    if (reason === "skipped") {
      const next = addSkippedSlug(skipped, card.slug);
      setSkipped(next);
      window.sessionStorage.setItem(
        PAIRING_REVIEW_SKIP_STORAGE_KEY,
        JSON.stringify(next),
      );
    }
    const nextSlug = nextReviewSlug(slugs, card.slug, showCurated ? undefined : pendingSlugs);
    if (nextSlug) goTo(nextSlug);
  }

  function approveSelected() {
    if (pending) return;
    if (selectedDrafts.length === 0) {
      setMessage("Selecteaza cel putin o asociere.");
      setMessageKind("error");
      return;
    }
    const localErrors: Record<string, string> = {};
    for (const draft of newDrafts) {
      const key = draftSelectionKey(card.slug, draft.dish);
      if (selected[key] !== true) continue;
      const dish = edits[key]?.dish ?? draft.dish;
      if (!isKnownPairingDish(dish)) {
        localErrors[key] = UNKNOWN_DISH_CATEGORY_CARD_MESSAGE;
      }
    }
    if (Object.keys(localErrors).length > 0) {
      setDraftErrors(localErrors);
      setMessage(Object.values(localErrors)[0] ?? UNKNOWN_DISH_CATEGORY_CARD_MESSAGE);
      setMessageKind("error");
      return;
    }
    setDraftErrors({});
    const approvedSlug = card.slug;
    const approvedName = card.name;
    startTransition(async () => {
      const result = await approveCuratedPairingsAction({
        wineId: card.id,
        drafts: selectedDrafts.map((draft) => ({
          dish: draft.dish,
          category: draft.category,
          rationale: draft.rationale,
          basis: draft.basis,
          confidence: draft.confidence,
          strength: draft.strength,
          styleOnlyWarning: draft.styleOnlyWarning,
          provenanceLocked: draft.provenanceLocked,
          originalDish: draft.originalDish,
          originalRationale: draft.originalRationale,
          dishId: draft.dishId,
        })),
      });
      if (!result.ok) {
        setMessage(result.error);
        setMessageKind("error");
        const failedDish = result.dish ?? dishFromCurationError(result.error);
        if (failedDish) {
          const failedDraft = newDrafts.find((draft) => {
            const key = draftSelectionKey(approvedSlug, draft.dish);
            const currentDish = edits[key]?.dish ?? draft.dish;
            return currentDish === failedDish;
          });
          if (failedDraft) {
            const cardMessage = /nu este in taxonomie/i.test(result.error)
              ? UNKNOWN_DISH_CATEGORY_CARD_MESSAGE
              : result.error;
            setDraftErrors({
              [draftSelectionKey(approvedSlug, failedDraft.dish)]: cardMessage,
            });
          }
        }
        return;
      }
      setDraftErrors({});
      setLocalCards((current) =>
        applyApprovedPairingsToCards(current, approvedSlug, result.pairings),
      );
      setSelected((current) => clearKeyedStateForSlug(current, approvedSlug));
      setEdits((current) => clearKeyedStateForSlug(current, approvedSlug));
      setMessage(
        result.message ||
          approvalSuccessMessage(result.approvedCount, approvedName),
      );
      setMessageKind("success");
      const nextSlug = nextReviewSlug(
        slugs,
        approvedSlug,
        showCurated ? undefined : pendingSlugs.filter((slug) => slug !== approvedSlug),
      );
      if (nextSlug) goTo(nextSlug, { keepMessage: true });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Vin {position} / {progress.total} · {progress.reviewed} /{" "}
            {progress.total} revizuite
          </p>
          <p className="text-xs text-muted-foreground">
            {progress.curated} curate · {progress.skipped} sarite ·{" "}
            {progress.pending} in asteptare · status {status}
          </p>
          {batchComplete ? (
            <p className="text-sm font-medium text-foreground">
              {FIRST_BATCH_COMPLETE_MESSAGE}
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showCurated}
              onChange={(event) => setShowCurated(event.target.checked)}
            />
            Arata si vinurile deja curate
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const previous = prevReviewSlug(navSlugs, card.slug);
              if (previous) goTo(previous);
            }}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const next = nextReviewSlug(slugs, card.slug, showCurated ? undefined : pendingSlugs);
              if (next) goTo(next);
            }}
          >
            Urmatorul
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => skipCurrent("later")}
          >
            Mai tarziu
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => skipCurrent("skipped")}
          >
            Fara asociere
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              pending ||
              !canApproveCurationSelection(newDrafts.length, selectedDrafts.length)
            }
            onClick={approveSelected}
          >
            {pending ? "Se salveaza..." : "Aproba selectia"}
          </Button>
        </div>
      </div>

      <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Nu aproba asocieri doar pentru a creste scorul. Impactul este doar diagnostic.
      </p>
      {message ? (
        <p
          className={
            messageKind === "success"
              ? "rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
              : "text-sm text-foreground"
          }
        >
          {message}
        </p>
      ) : null}

      <div key={card.slug} className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border p-4">
            <h2 className="font-serif text-xl font-semibold">{card.name}</h2>
            <p className="text-sm text-muted-foreground">
              {card.winery} · {card.vintage ?? "n/a"} · {card.type} ·{" "}
              {card.sweetness ?? "n/a"}
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
          <h3 className="font-medium">{card.producerCulinaryLabel}</h3>
          {card.producerCulinary ? (
            <p className="mt-2 text-sm">{card.producerCulinary}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Fara recomandare culinara oficiala. Textul de degustare nu este tratat ca
              asociere.
            </p>
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
            <ul className="mt-3 space-y-3">
              {card.existingPairings.map((pairing) => {
                const meta = reviewPairingMeta(pairing.strength, pairing.basis);
                const approvedAt = reviewApprovedAtLabel(pairing.curatedAt);
                return (
                  <li
                    key={pairing.dish}
                    className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
                  >
                    <p className="text-sm font-medium">{pairing.dish}</p>
                    {pairing.note ? (
                      <p className="mt-1 text-sm text-foreground/90">
                        {pairing.note}
                      </p>
                    ) : null}
                    {meta ? (
                      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
                    ) : null}
                    {approvedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">{approvedAt}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-medium">
            {card.existingPairings.length > 0
              ? "Sugestii noi"
              : "Propuneri initiale"}
          </h3>
          {card.existingPairings.length >= 4 ? (
            <p className="text-sm text-amber-800">{FOUR_PAIRINGS_WARNING}</p>
          ) : null}
          {card.warnings.map((warning) => (
            <p key={warning} className="text-sm text-amber-800">
              {warning}
            </p>
          ))}
          {newDrafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {NO_NEW_CURATION_DRAFTS_MESSAGE}
            </p>
          ) : null}
          {newDrafts.map((draft) => {
            const key = draftSelectionKey(card.slug, draft.dish);
            const edit = edits[key] ?? {
              dish: draft.dish,
              rationale: draft.rationale,
              strength: draft.strength,
            };
            const checked = selected[key] === true;
            const resolved = producerContext
              ? resolveDraftProducerProvenance(
                  { ...draft, dish: edit.dish },
                  producerContext,
                )
              : draft;
            const relatedNotice =
              resolved.producerProvenanceClass === "RELATED_PRODUCER_CATEGORY";
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
                      onChange={(event) => {
                        setEdits((current) => ({
                          ...current,
                          [key]: { ...edit, dish: event.target.value },
                        }));
                        setDraftErrors((current) => {
                          const next = { ...current };
                          delete next[key];
                          return next;
                        });
                      }}
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
                    <div className="flex flex-wrap gap-2">
                      {draft.romanianDiscovery ? (
                        <span className="rounded-full bg-wine/10 px-2 py-0.5 text-xs text-wine">
                          Descoperire romaneasca
                        </span>
                      ) : null}
                      {draft.romanianRegion ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Traditie: {draft.romanianRegion}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs">
                      Sursa editoriala: Recomandare VinIntel
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Baza: {basisProvenanceLabel(resolved.basis)}
                    </p>
                    {relatedNotice ? (
                      <p className="text-xs text-amber-800">{RELATED_PRODUCER_NOTICE}</p>
                    ) : null}
                    {draftErrors[key] ? (
                      <p className="text-xs text-amber-800">
                        ⚠ {draftErrors[key]}
                      </p>
                    ) : null}
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
                      Strength: {draft.strength} · Incredere propunere:{" "}
                      {draft.confidence}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </section>
      </div>
    </div>
  );
}
