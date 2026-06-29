import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AddWineLoading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl animate-pulse px-6 py-16">
        <div className="mx-auto h-8 w-48 rounded-full bg-secondary" />
        <div className="mx-auto mt-6 h-12 w-full max-w-xl rounded-2xl bg-secondary" />
        <div className="mx-auto mt-4 h-14 w-full max-w-2xl rounded-2xl bg-secondary" />
      </main>
      <SiteFooter />
    </>
  );
}
