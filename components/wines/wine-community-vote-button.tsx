"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VinScoreBadge } from "@/components/wines/vin-score-badge";
import { cn } from "@/lib/utils";

const VOTER_KEY_STORAGE = "vinintel-voter-key";
const voteStorageKey = (wineId: number) => `vinintel-vote-${wineId}`;

function getOrCreateVoterKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(VOTER_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY_STORAGE, key);
  }
  return key;
}

interface WineCommunityVoteButtonProps {
  wineId: number;
  initialScore: number | null;
  initialVoteCount: number;
}

export function WineCommunityVoteButton({
  wineId,
  initialScore,
  initialVoteCount,
}: WineCommunityVoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(75);
  const [communityScore, setCommunityScore] = useState(initialScore);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const syncFromServer = useCallback(async () => {
    const voterKey = getOrCreateVoterKey();
    if (!voterKey) return;

    const cached = localStorage.getItem(voteStorageKey(wineId));
    if (cached) {
      const parsed = Number(cached);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
        setUserScore(parsed);
        setScore(parsed);
        setHasVoted(true);
      }
    }

    try {
      const res = await fetch(
        `/api/wines/${wineId}/vote?voterKey=${encodeURIComponent(voterKey)}`,
      );
      if (!res.ok) return;
      const data: {
        communityScore?: number | null;
        communityVoteCount?: number;
        userScore?: number | null;
        hasVoted?: boolean;
      } = await res.json();
      if (data.communityScore != null) setCommunityScore(data.communityScore);
      if (data.communityVoteCount != null) setVoteCount(data.communityVoteCount);
      if (data.userScore != null) {
        setUserScore(data.userScore);
        setScore(data.userScore);
        setHasVoted(true);
        localStorage.setItem(voteStorageKey(wineId), String(data.userScore));
      } else if (data.hasVoted === false) {
        setHasVoted(false);
      }
    } catch {
      /* ignore sync errors */
    }
  }, [wineId]);

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  async function submitVote() {
    setLoading(true);
    setError(null);
    try {
      const voterKey = getOrCreateVoterKey();
      const res = await fetch(`/api/wines/${wineId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, voterKey }),
      });
      const data: {
        error?: string;
        communityScore?: number;
        communityVoteCount?: number;
        userScore?: number;
        hasVoted?: boolean;
        rateLimited?: boolean;
      } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Eroare la trimitere.");

      if (data.communityScore != null) setCommunityScore(data.communityScore);
      if (data.communityVoteCount != null) setVoteCount(data.communityVoteCount);
      if (data.userScore != null) {
        setUserScore(data.userScore);
        setHasVoted(true);
        localStorage.setItem(voteStorageKey(wineId), String(data.userScore));
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la trimitere.");
    } finally {
      setLoading(false);
    }
  }

  function openVoteDialog() {
    setOpen(true);
    setDone(false);
    setError(null);
  }

  return (
    <div className="space-y-3">
      {hasVoted && userScore != null ? (
        <div className="rounded-xl border border-wine/20 bg-wine/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Ai votat deja acest vin cu nota{" "}
            <span className="font-semibold text-wine">{userScore}/100</span>.
            Vrei sa modifici nota?
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="border-wine/30 text-wine hover:bg-wine/5"
        onClick={openVoteDialog}
      >
        {hasVoted ? "Modifica nota" : "Voteaza si tu"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setDone(false);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasVoted ? "Modifica nota ta" : "Voteaza acest vin"}
            </DialogTitle>
            <DialogDescription>
              {hasVoted
                ? "Poti actualiza nota o singura data per cont de browser. Modificarile recalculeaza Community Score."
                : "Cat de mult merita pretul dupa experienta ta? Nota ta contribuie la Community Score (0-100)."}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Multumim! Nota ta de{" "}
                <span className="font-semibold text-wine">
                  {userScore ?? score}/100
                </span>{" "}
                a fost inregistrata.
              </p>
              {communityScore != null ? (
                <p className="text-sm text-muted-foreground">
                  Community Score actual:{" "}
                  <span className="font-medium text-foreground">
                    {communityScore}/100
                  </span>{" "}
                  ({voteCount} {voteCount === 1 ? "vot" : "voturi"})
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Nota ta</span>
                  <VinScoreBadge score={score} size="md" showLabel={false} />
                </div>
                <input
                  type="range"
                  min={45}
                  max={98}
                  step={1}
                  value={score}
                  onChange={(event) => setScore(Number(event.target.value))}
                  className={cn(
                    "h-2 w-full cursor-pointer appearance-none rounded-full",
                    "bg-secondary accent-wine",
                  )}
                  aria-label="Nota comunitate 45-98"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>45 Slab</span>
                  <span>75 Bun</span>
                  <span>98 Excelent</span>
                </div>
              </div>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Anuleaza
                </Button>
                <Button
                  type="button"
                  className="bg-wine text-wine-foreground hover:bg-wine/90"
                  disabled={loading}
                  onClick={submitVote}
                >
                  {loading
                    ? "Se trimite..."
                    : hasVoted
                      ? "Salveaza nota noua"
                      : "Trimite votul"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
