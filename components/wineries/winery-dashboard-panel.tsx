import {
  ArrowLeft,
  BarChart3,
  Eye,
  MousePointerClick,
  ShoppingBag,
  Ticket,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { PremiumBadge } from "@/components/wineries/premium-badge";
import { WineryBillingPortalButton } from "@/components/wineries/winery-billing-portal-button";
import { WineryViewsChart } from "@/components/wineries/winery-views-chart";
import { Button } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/seo";
import type { WineryDashboardStats } from "@/lib/winery-analytics-dashboard";

interface WineryDashboardPanelProps {
  wineryName: string;
  winerySlug: string;
  stats: WineryDashboardStats;
  stripeCustomerId?: string | null;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Eye;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-serif text-3xl font-bold text-foreground">
            {value.toLocaleString("ro-RO")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-xl bg-wine/10 p-2.5 text-wine">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function WineryDashboardPanel({
  wineryName,
  winerySlug,
  stats,
  stripeCustomerId,
}: WineryDashboardPanelProps) {
  const totalCtaClicks = stats.visitClicks30d + stats.purchaseClicks30d;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge size="sm" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              Ultimele 30 zile
            </span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Dashboard {wineryName}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Vizualizari, interactiuni si interes pentru vinurile tale pe VinIntel.
            Datele se actualizeaza in timp real pe masura ce vizitatorii interactioneaza
            cu pagina cramei.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
          <Button asChild variant="outline" className="shrink-0 border-wine/30 text-wine">
            <Link href={`/wineries/${winerySlug}`}>
              <ArrowLeft className="h-4 w-4" />
              Inapoi la profil
            </Link>
          </Button>
          {stripeCustomerId ? (
            <WineryBillingPortalButton winerySlug={winerySlug} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vizualizari pagina"
          value={stats.pageViews30d}
          hint="Vizite unice inregistrate pe profilul cramei"
          icon={Eye}
        />
        <StatCard
          label="Click-uri CTA"
          value={totalCtaClicks}
          hint="Vizite crama + cumparaturi din profil"
          icon={MousePointerClick}
        />
        <StatCard
          label="Click-uri vizita"
          value={stats.visitClicks30d}
          hint="Butonul Viziteaza crama"
          icon={Ticket}
        />
        <StatCard
          label="Click-uri cumparare"
          value={stats.purchaseClicks30d}
          hint="Butonul Cumpara de pe vinuri"
          icon={ShoppingBag}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-wine" aria-hidden="true" />
            <h2 className="font-serif text-xl font-semibold text-foreground">
              Vizualizari in timp
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Evolutia zilnica a vizualizarilor paginii cramei.
          </p>
          <div className="mt-6">
            {stats.pageViews30d > 0 ? (
              <WineryViewsChart data={stats.dailyViews} />
            ) : (
              <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 px-6 text-center text-sm text-muted-foreground">
                Inca nu avem vizualizari in ultimele 30 zile. Datele apar dupa ce
                vizitatorii deschid pagina publica a cramei.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Vinuri populare
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cele mai multe click-uri pe vinuri din profilul tau.
          </p>

          {stats.topWines.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {stats.topWines.map((wine, index) => (
                <li
                  key={wine.wineId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-wine">
                      #{index + 1}
                    </p>
                    <Link
                      href={`/wines/${wine.wineSlug}`}
                      className="mt-0.5 block truncate font-medium text-foreground hover:text-wine"
                    >
                      {wine.wineName}
                    </Link>
                  </div>
                  <span className="shrink-0 rounded-full bg-wine/10 px-2.5 py-1 text-xs font-semibold text-wine">
                    {wine.views} click-uri
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-sm text-muted-foreground">
              Niciun click pe vinuri inca. Promoveaza profilul Premium si vinurile
              tale pentru a vedea topul aici.
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-foreground">
          Badge embed pentru site-ul cramei
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adauga badge-ul VinIntel pe site-ul cramei pentru a arata vizitatorilor ca profilul
          este listat si verificat.
        </p>
        <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <img
            src={absoluteUrl(`/embed/winery/${winerySlug}/badge`)}
            alt={`Profil ${wineryName} pe VinIntel`}
            width={320}
            height={80}
            className="max-w-full"
          />
        </div>
        <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="embed-code">
          Cod HTML
        </label>
        <textarea
          id="embed-code"
          readOnly
          rows={3}
          className="mt-2 w-full rounded-xl border border-border/70 bg-background px-3 py-2 font-mono text-xs text-muted-foreground"
          value={`<a href="${absoluteUrl(`/wineries/${winerySlug}`)}" target="_blank" rel="noopener noreferrer"><img src="${absoluteUrl(`/embed/winery/${winerySlug}/badge`)}" alt="Profil verificat ${wineryName} pe VinIntel" width="320" height="80" loading="lazy" /></a>`}
        />
      </section>
    </div>
  );
}
