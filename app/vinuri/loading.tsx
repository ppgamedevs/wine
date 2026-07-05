import { Skeleton } from "@/components/ui/skeleton";

export default function VinuriCatalogLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
          <Skeleton className="mx-auto h-7 w-28" />
          <Skeleton className="mx-auto mt-5 h-12 w-80" />
          <Skeleton className="mx-auto mt-4 h-12 w-full max-w-2xl" />
          <Skeleton className="mx-auto mt-6 h-10 w-64" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Skeleton className="mx-auto h-12 w-full max-w-xl rounded-full" />
        <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
