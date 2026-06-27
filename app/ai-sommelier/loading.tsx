import { Skeleton } from "@/components/ui/skeleton";

export default function AiSommelierLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-14 text-center sm:py-16">
          <Skeleton className="mx-auto h-7 w-48 rounded-full" />
          <Skeleton className="mx-auto h-12 w-3/4" />
          <Skeleton className="mx-auto h-6 w-2/3" />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    </div>
  );
}
