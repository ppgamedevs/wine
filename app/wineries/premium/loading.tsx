import { Skeleton } from "@/components/ui/skeleton";

export default function WineryPremiumLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center lg:py-24">
          <Skeleton className="mx-auto h-8 w-40 rounded-full" />
          <Skeleton className="mx-auto mt-6 h-14 w-full max-w-lg" />
          <Skeleton className="mx-auto mt-4 h-14 w-full max-w-md" />
          <Skeleton className="mx-auto mt-8 h-12 w-48" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mt-10 h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}
