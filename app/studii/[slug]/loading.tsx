import { SiteHeader } from "@/components/site-header";

export default function StudiiLoading() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6 px-6 py-12">
          <div className="h-10 w-2/3 rounded-lg bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-64 rounded-2xl bg-muted" />
        </div>
      </main>
    </>
  );
}
