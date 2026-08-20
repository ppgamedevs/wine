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
const voteStorageKey = (wineSlug: string) => `vinintel-vote-${wineSlug}`;

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
  wineSlug: string;
  initialScore: number | null;
  initialVoteCount: number;
  labels: {
    alreadyVoted: string;
    editVote: string;
    vote: string;
    editTitle: string;
    voteTitle: string;
    editDescription: string;
    voteDescription: string;
    thanks: string;
    currentScore: string;
    oneVote: string;
    manyVotes: string;
    yourScore: string;
    rangeLabel: string;
    weak: string;
    good: string;
    excellent: string;
    cancel: string;
    sending: string;
    save: string;
    submit: string;
    submitError: string;
  };
}

function fillLabel(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (label, [key, value]) =>
      label.replaceAll(`__${key.toUpperCase()}__`, String(value)),
    template,
  );
}

export function WineCommunityVoteButton({
  wineSlug,
  initialScore,
  initialVoteCount,
  labels,
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

    const cached = localStorage.getItem(voteStorageKey(wineSlug));
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
        `/api/wines/${encodeURIComponent(wineSlug)}/vote?voterKey=${encodeURIComponent(voterKey)}`,
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
        localStorage.setItem(voteStorageKey(wineSlug), String(data.userScore));
      } else if (data.hasVoted === false) {
        setHasVoted(false);
      }
    } catch {
      /* ignore sync errors */
    }
  }, [wineSlug]);

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  async function submitVote() {
    setLoading(true);
    setError(null);
    try {
      const voterKey = getOrCreateVoterKey();
      const res = await fetch(`/api/wines/${encodeURIComponent(wineSlug)}/vote`, {
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
      if (!res.ok) throw new Error(labels.submitError);

      if (data.communityScore != null) setCommunityScore(data.communityScore);
      if (data.communityVoteCount != null) setVoteCount(data.communityVoteCount);
      if (data.userScore != null) {
        setUserScore(data.userScore);
        setHasVoted(true);
        localStorage.setItem(voteStorageKey(wineSlug), String(data.userScore));
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.submitError);
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
            {fillLabel(labels.alreadyVoted, { score: userScore })}
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="border-wine/30 text-wine hover:bg-wine/5"
        onClick={openVoteDialog}
      >
        {hasVoted ? labels.editVote : labels.vote}
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
              {hasVoted ? labels.editTitle : labels.voteTitle}
            </DialogTitle>
            <DialogDescription>
              {hasVoted
                ? labels.editDescription
                : labels.voteDescription}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                {fillLabel(labels.thanks, { score: userScore ?? score })}
              </p>
              {communityScore != null ? (
                <p className="text-sm text-muted-foreground">
                  {fillLabel(labels.currentScore, {
                    score: communityScore,
                    votes:
                      voteCount === 1
                        ? labels.oneVote
                        : fillLabel(labels.manyVotes, { count: voteCount }),
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    {labels.yourScore}
                  </span>
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
                  aria-label={labels.rangeLabel}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{labels.weak}</span>
                  <span>{labels.good}</span>
                  <span>{labels.excellent}</span>
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
                  {labels.cancel}
                </Button>
                <Button
                  type="button"
                  className="bg-wine text-wine-foreground hover:bg-wine/90"
                  disabled={loading}
                  onClick={submitVote}
                >
                  {loading
                    ? labels.sending
                    : hasVoted
                      ? labels.save
                      : labels.submit}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
