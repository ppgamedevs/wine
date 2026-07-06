import { Skeleton } from "@/components/ui/skeleton";

export default function LegalPageLoading() {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
