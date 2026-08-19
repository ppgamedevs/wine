"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface WineReportButtonProps {
  wineId: number;
  labels: {
    trigger: string;
    title: string;
    description: string;
    thanks: string;
    placeholder: string;
    cancel: string;
    sending: string;
    submit: string;
    submitError: string;
  };
}

export function WineReportButton({
  wineId,
  labels,
}: WineReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wines/${wineId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      await res.json();
      if (!res.ok) throw new Error(labels.submitError);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.submitError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground transition-colors hover:text-destructive"
      >
        {labels.trigger}
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setDone(false);
            setError(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>
              {labels.description}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <p className="text-sm text-foreground">
              {labels.thanks}
            </p>
          ) : (
            <>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={labels.placeholder}
                rows={4}
              />
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
                  onClick={submitReport}
                >
                  {loading ? labels.sending : labels.submit}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
