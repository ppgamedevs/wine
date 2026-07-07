import { Skeleton } from "@/components/ui/skeleton";

export default function PremiumCheckoutLoading() {
  return (
    <div className="flex-1">
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-10 w-96" />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
