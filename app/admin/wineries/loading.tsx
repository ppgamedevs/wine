import { Skeleton } from "@/components/ui/skeleton";

export default function AdminWineriesLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </main>
  );
}
