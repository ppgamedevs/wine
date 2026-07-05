import { Skeleton } from "@/components/ui/skeleton";

export default function JournalArticleLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Skeleton className="h-9 w-44" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-12 w-full" />
        <Skeleton className="mt-4 h-20 w-full" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
