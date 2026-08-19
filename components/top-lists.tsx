import { Reveal } from "@/components/reveal";
import { TopListGrid } from "@/components/top-list-grid";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";

export async function TopLists() {
  const { locale, t } = await getDiscoveryI18n();
  const links = [
    {
      slug: "cele-mai-bune-vinuri-romanesti",
      title: t("TopLists.items.best.title"),
      description: t("TopLists.items.best.description"),
    },
    {
      slug: "vinuri-sub-50-lei",
      title: t("TopLists.items.under50.title"),
      description: t("TopLists.items.under50.description"),
    },
    {
      slug: "vinuri-bune-din-supermarket",
      title: t("TopLists.items.supermarket.title"),
      description: t("TopLists.items.supermarket.description"),
    },
    {
      slug: "vinuri-sub-50-lei-pentru-sarmale",
      title: t("TopLists.items.sarmale.title"),
      description: t("TopLists.items.sarmale.description"),
    },
    {
      slug: "cele-mai-bune-feteasca-neagra",
      title: t("TopLists.items.feteasca.title"),
      description: t("TopLists.items.feteasca.description"),
    },
    {
      slug: "vinuri-cadou",
      title: t("TopLists.items.gift.title"),
      description: t("TopLists.items.gift.description"),
    },
    {
      slug: "vinuri-sub-100-lei-pentru-cina-romantica",
      title: t("TopLists.items.romantic.title"),
      description: t("TopLists.items.romantic.description"),
    },
  ];

  return (
    <section className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            {t("TopLists.heading")}
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            {t("TopLists.description")}
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <TopListGrid links={links} locale={locale} />
        </Reveal>
      </div>
    </section>
  );
}
