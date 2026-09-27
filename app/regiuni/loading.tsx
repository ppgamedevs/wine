import { Skeleton } from "@/components/ui/skeleton";

export default function RegionsIndexLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
          <Skeleton className="mx-auto h-7 w-36" />
          <Skeleton className="mx-auto mt-5 h-12 w-80" />
          <Skeleton className="mx-auto mt-4 h-12 w-full max-w-2xl" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
