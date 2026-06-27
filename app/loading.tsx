import { Wine } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4">
      <span className="inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-wine/10 text-wine">
        <Wine className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="text-sm text-muted-foreground">Se decanteaza continutul...</p>
    </div>
  );
}
