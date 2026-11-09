import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import {
  readPriceRefreshStats,
  readPriceRefreshStatus,
} from "@/lib/price-refresh-store";

export const metadata: Metadata = {
  title: "Admin price refresh",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function fmt(value: string | null | undefined): string {
  if (!value) return "niciodată";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ro-RO");
}

export default async function PriceRefreshAdminPage() {
  await requireAdmin();
  const [{ state, runs, unavailable }, stats] = await Promise.all([
    readPriceRefreshStatus(),
    readPriceRefreshStats(),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <Link href="/admin/wines" className="text-sm text-wine hover:underline">
          ← Vinuri
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold">
          Actualizare zilnică prețuri
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fiecare ofertă afiliată verificată este reîmprospătată în batch-uri
          resumabile. Prețurile istorice rămân intacte când extragerea eșuează.
        </p>
      </div>

      {unavailable ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Tabelele de refresh nu sunt încă migrate. Aplică migrația 0031 înainte
          de a activa cron-ul.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Vinuri", stats?.totalWines ?? "-"],
          ["Cu URL producător", stats?.withProducer ?? "-"],
          ["Cu referință eMAG", stats?.withEmag ?? "-"],
          ["Cu link afiliat", stats?.withAffiliate ?? "-"],
          ["Cu preț curent", stats?.current ?? "-"],
          ["Preț indisponibil", stats?.unavailable ?? "-"],
          ["Observații vechi", stats?.stale ?? "-"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["Cursor", state?.cursor ?? 0],
          ["Ultimul start", fmt(state?.lastStartedAt)],
          ["Ultimul succes", fmt(state?.lastSuccessAt)],
          ["Ultima eroare", state?.lastError ? "da" : "nu"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Start</th>
              <th className="p-3">Status</th>
              <th className="p-3">Procesate</th>
              <th className="p-3">Modificate</th>
              <th className="p-3">Neschimbate</th>
              <th className="p-3">Eșuate</th>
              <th className="p-3">Cursor</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t">
                <td className="p-3">{fmt(run.startedAt)}</td>
                <td className="p-3">{run.status}</td>
                <td className="p-3">{run.processed}</td>
                <td className="p-3">{run.updated}</td>
                <td className="p-3">{run.unchanged}</td>
                <td className="p-3">{run.failed}</td>
                <td className="p-3">
                  {run.cursorStart} → {run.cursorEnd ?? "?"}
                </td>
              </tr>
            ))}
            {runs.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  Nicio rulare încă.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
