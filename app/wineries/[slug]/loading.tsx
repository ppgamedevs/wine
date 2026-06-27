import { Skeleton } from "@/components/ui/skeleton";

export default function WineryLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
          <Skeleton className="h-4 w-44" />
          <div className="mt-6 flex flex-col gap-6 sm:flex-row">
            <Skeleton className="h-24 w-24 rounded-2xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
              <div className="grid grid-cols-2 gap-4 sm:max-w-lg sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-14">
        <Skeleton className="h-8 w-64" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
