import { Skeleton } from "@/components/ui/skeleton";

export default function ClaimLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center lg:py-20">
          <Skeleton className="mx-auto h-7 w-40" />
          <Skeleton className="mx-auto mt-5 h-12 w-3/4" />
          <Skeleton className="mx-auto mt-5 h-16 w-full max-w-2xl" />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
