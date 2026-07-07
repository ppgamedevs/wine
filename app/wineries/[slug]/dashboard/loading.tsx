import { Skeleton } from "@/components/ui/skeleton";

export default function WineryDashboardLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-10 w-2/3 max-w-lg" />
          <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-96 rounded-3xl lg:col-span-3" />
            <Skeleton className="h-96 rounded-3xl lg:col-span-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
