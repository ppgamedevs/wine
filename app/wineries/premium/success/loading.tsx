import { Skeleton } from "@/components/ui/skeleton";

export default function PremiumSuccessLoading() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6">
      <Skeleton className="h-80 w-full max-w-2xl rounded-2xl" />
    </div>
  );
}
