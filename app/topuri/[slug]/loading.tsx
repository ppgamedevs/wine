import { Skeleton } from "@/components/ui/skeleton";

export default function TopListLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-5xl space-y-4 px-6 py-12 sm:py-14">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        <Skeleton className="h-72 rounded-2xl" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
