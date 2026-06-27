"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, Wand2, Wine as WineIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ExpertRecommendationCard } from "@/components/sommelier/expert-recommendation-card";
import { sommelierResponseSchema } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { OCCASIONS, computeBudgetFit } from "@/lib/sommelier";
import { EASE_OUT } from "@/lib/motion";
import type { ExpertRecommendationDisplay, WineWithRelations } from "@/types";

interface WineryOption {
  id: number;
  name: string;
  slug: string;
}

const colorOptions = [
  { value: "any", label: "Oricare" },
  { value: "red", label: "Rosu" },
  { value: "white", label: "Alb" },
  { value: "rose", label: "Rose" },
  { value: "sparkling", label: "Spumant" },
];

const sweetnessOptions = [
  { value: "any", label: "Oricare" },
  { value: "sec", label: "Sec" },
  { value: "demisec", label: "Demisec" },
  { value: "demidulce", label: "Demidulce" },
  { value: "dulce", label: "Dulce" },
];

export function SommelierForm({
  wineries,
  wines,
}: {
  wineries: WineryOption[];
  wines: WineWithRelations[];
}) {
  const [budget, setBudget] = useState<[number, number]>([30, 150]);
  const [occasion, setOccasion] = useState("oricare");
  const [color, setColor] = useState("any");
  const [sweetness, setSweetness] = useState("any");
  const [selectedWineries, setSelectedWineries] = useState<string[]>([]);

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/sommelier",
    schema: sommelierResponseSchema,
  });

  const wineBySlug = useMemo(
    () => new Map(wines.map((w) => [w.slug, w])),
    [wines],
  );

  const activeOccasion = OCCASIONS.find((o) => o.id === occasion);

  const enrichedRecommendations = useMemo((): ExpertRecommendationDisplay[] => {
    if (!object?.recommendations?.length) return [];

    return object.recommendations
      .map((rec) => {
        if (!rec?.wineSlug) return null;
        const wine = wineBySlug.get(rec.wineSlug);
        if (!wine) return null;

        return {
          wineSlug: rec.wineSlug,
          rank: rec.rank ?? 1,
          matchScore: rec.matchScore ?? 80,
          whyThisWine: rec.whyThisWine ?? "",
          thingsYouShouldKnow: rec.thingsYouShouldKnow ?? [],
          pairingScience: rec.pairingScience ?? "",
          servingAndStorage: rec.servingAndStorage ?? "",
          wine,
          budgetFit: computeBudgetFit(wine.priceAvg, budget[0], budget[1]),
        };
      })
      .filter((r): r is ExpertRecommendationDisplay => r !== null)
      .sort((a, b) => a.rank - b.rank);
  }, [object, wineBySlug, budget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit({
      budgetMin: budget[0],
      budgetMax: budget[1],
      occasion,
      color,
      sweetness,
      preferredWinerySlugs: selectedWineries,
    });
  };

  const toggleWinery = (slug: string, checked: boolean) => {
    setSelectedWineries((prev) =>
      checked ? [...prev, slug] : prev.filter((s) => s !== slug),
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
      <Card className="border-border/70 bg-card shadow-sm lg:sticky lg:top-24">
        <CardContent className="p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Buget (RON)</Label>
                <span className="text-sm font-semibold text-wine">
                  {budget[0]} - {budget[1]} RON
                </span>
              </div>
              <Slider
                value={budget}
                onValueChange={(v) =>
                  setBudget([v[0], v[1]] as [number, number])
                }
                min={0}
                max={300}
                step={10}
                minStepsBetweenThumbs={1}
                aria-label="Interval de buget in RON"
              />
              <p className="text-xs text-muted-foreground">
                Tragem ambele capete pentru a seta intervalul de pret.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occasion-trigger" className="text-sm font-medium">
                Ocazie
              </Label>
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger id="occasion-trigger" className="w-full">
                  <SelectValue placeholder="Alege ocazia" />
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeOccasion ? (
                <p className="text-xs text-muted-foreground">
                  {activeOccasion.description}
                </p>
              ) : null}
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Tip vin</Label>
              <RadioGroup
                value={color}
                onValueChange={setColor}
                className="flex flex-wrap gap-2"
              >
                {colorOptions.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`color-${opt.value}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors has-[:checked]:border-wine has-[:checked]:bg-wine/5 has-[:checked]:text-wine"
                  >
                    <RadioGroupItem
                      id={`color-${opt.value}`}
                      value={opt.value}
                      className="sr-only"
                    />
                    {opt.label}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="sweetness-trigger"
                className="text-sm font-medium"
              >
                Dulceata
              </Label>
              <Select value={sweetness} onValueChange={setSweetness}>
                <SelectTrigger id="sweetness-trigger" className="w-full">
                  <SelectValue placeholder="Alege dulceata" />
                </SelectTrigger>
                <SelectContent>
                  {sweetnessOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {wineries.length > 0 ? (
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">
                  Crame preferate{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-border/70 p-3 sm:grid-cols-2">
                  {wineries.map((winery) => (
                    <Label
                      key={winery.id}
                      htmlFor={`winery-${winery.id}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
                    >
                      <Checkbox
                        id={`winery-${winery.id}`}
                        checked={selectedWineries.includes(winery.slug)}
                        onCheckedChange={(checked) =>
                          toggleWinery(winery.slug, checked === true)
                        }
                      />
                      <span className="truncate">{winery.name}</span>
                    </Label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="flex-1 bg-wine text-wine-foreground hover:bg-wine/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Somelierul analizeaza...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Recomanda-mi vinul potrivit
                  </>
                )}
              </Button>
              {isLoading ? (
                <Button type="button" variant="outline" onClick={stop}>
                  Opreste
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {!object && !isLoading && !error ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 px-8 text-center"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-wine/10 text-wine">
                <Sparkles className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-foreground">
                Somelierul tau personal te asteapta
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Completeaza preferintele si primesti recomandari de nivel expert,
                cu insight-uri stiintifice despre fiecare vin.
              </p>
            </motion.div>
          ) : null}

          {isLoading && !object?.recommendations?.length ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/70 bg-card px-8 text-center"
            >
              <Loader2 className="h-10 w-10 animate-spin text-wine" />
              <div>
                <p className="font-medium text-foreground">
                  Caut in baza de date si formulez recomandari...
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Retrieval hibrid + analiza sommelier AI
                </p>
              </div>
            </motion.div>
          ) : null}

          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-[200px] items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-8 text-center text-sm text-muted-foreground"
            >
              {error.message ||
                "A aparut o eroare. Verifica GROQ_API_KEY si incearca din nou."}
            </motion.div>
          ) : null}

          {object?.summary || enrichedRecommendations.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="space-y-4"
            >
              {object?.summary ? (
                <p className="rounded-xl border border-wine/20 bg-wine/5 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                  {object.summary}
                </p>
              ) : null}

              {enrichedRecommendations.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <WineIcon className="h-4 w-4 text-wine" aria-hidden="true" />
                    {enrichedRecommendations.length} recomandari expert
                    {isLoading ? " (se genereaza...)" : ""}
                  </div>
                  {enrichedRecommendations.map((rec, index) => (
                    <ExpertRecommendationCard
                      key={rec.wineSlug}
                      recommendation={rec}
                      rank={rec.rank}
                      index={index}
                    />
                  ))}
                </>
              ) : isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Se structureaza recomandarile...
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
