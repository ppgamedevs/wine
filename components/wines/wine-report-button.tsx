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

export function WineReportButton({ wineId }: { wineId: number }) {
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
      const data: { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Eroare la trimitere.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la trimitere.");
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
        Cred ca raspunsul este gresit
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
            <DialogTitle>Raporteaza o problema</DialogTitle>
            <DialogDescription>
              Spune-ne ce ti se pare gresit: pret, soiuri, scor sau analiza
              editoriala. Echipa VinIntel verifica manual.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <p className="text-sm text-foreground">
              Multumim. Raportul a fost trimis si va fi verificat de echipa
              noastra.
            </p>
          ) : (
            <>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex: pretul afisat nu corespunde sau regiunea e gresita..."
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
                  Anuleaza
                </Button>
                <Button
                  type="button"
                  className="bg-wine text-wine-foreground hover:bg-wine/90"
                  disabled={loading}
                  onClick={submitReport}
                >
                  {loading ? "Se trimite..." : "Trimite raportul"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
