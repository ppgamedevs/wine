import { SiteFooter, type FooterCopy } from "@/components/site-footer";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";

export async function LocalizedSiteFooter() {
  const { t } = await getDiscoveryI18n();
  const copy: FooterCopy = {
    tagline: t("Footer.tagline"),
    pivotHeading: t("Footer.pivotHeading"),
    pivotAria: t("Footer.pivotAria"),
    regionsHeading: t("Footer.regionsHeading"),
    regionsAria: t("Footer.regionsAria"),
    navigationAria: t("Footer.navigationAria"),
    copyright: t("Footer.copyright", { year: new Date().getFullYear() }),
    links: {
      wines: t("Footer.links.wines"),
      grapes: t("Footer.links.grapes"),
      wineries: t("Footer.links.wineries"),
      top: t("Footer.links.top"),
      studies: t("Footer.links.studies"),
      journal: t("Footer.links.journal"),
      sommelier: t("Footer.links.sommelier"),
      scores: t("Footer.links.scores"),
      privacy: t("Footer.links.privacy"),
      cookies: t("Footer.links.cookies"),
      claim: t("Footer.links.claim"),
      catalog: t("Footer.links.catalog"),
      best: t("Footer.links.best"),
      budget: t("Footer.links.budget"),
      wineryDirectory: t("Footer.links.wineryDirectory"),
    },
  };

  return <SiteFooter copy={copy} />;
}
