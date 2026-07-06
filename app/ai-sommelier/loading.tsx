import { Skeleton } from "@/components/ui/skeleton";

export default function AiSommelierLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-gradient-to-b from-[#faf7f5] via-background to-background">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Skeleton className="h-9 w-40 rounded-full" />
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-9 w-44 rounded-full" />
        </div>
      </div>
      <div className="border-t border-border/60 px-6 py-4">
        <Skeleton className="mx-auto h-[52px] max-w-3xl rounded-2xl" />
      </div>
    </div>
  );
}
