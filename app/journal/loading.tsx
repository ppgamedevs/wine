import { Skeleton } from "@/components/ui/skeleton";

export default function JournalLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-wine/10 bg-secondary/20">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:py-24">
          <Skeleton className="mx-auto h-5 w-32" />
          <Skeleton className="mx-auto mt-4 h-14 w-80" />
          <Skeleton className="mx-auto mt-5 h-8 w-full max-w-2xl" />
          <Skeleton className="mx-auto mt-8 h-11 w-72" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-36 rounded-full" />
          ))}
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
