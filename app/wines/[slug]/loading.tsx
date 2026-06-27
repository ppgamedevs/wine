import { Skeleton } from "@/components/ui/skeleton";

export default function WineLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-2 lg:py-14">
          <Skeleton className="aspect-[4/5] rounded-3xl" />
          <div className="flex flex-col justify-center space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-20 w-full max-w-xl" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
