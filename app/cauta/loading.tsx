import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SearchLoading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl animate-pulse px-6 py-14">
        <div className="h-10 w-64 rounded-lg bg-secondary" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-secondary" />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
