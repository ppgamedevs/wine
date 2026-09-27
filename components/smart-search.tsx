import {
  SmartSearchClient,
  type SmartSearchCopy,
} from "@/components/smart-search-client";
import type { AppLocale } from "@/i18n/locale";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";
import {
  WINE_PENDING_REVIEW_MESSAGE,
} from "@/lib/wine-submission-messages";

export const WINE_LINK_HELPER_TEXT =
  "Nu preluam vinuri din link momentan. Cauta dupa numele vinului sau al cramei, ori intreaba somelierul.";

export const WINE_SUBMITTED_FOR_REVIEW_MESSAGE = WINE_PENDING_REVIEW_MESSAGE;

interface SmartSearchProps {
  className?: string;
  placeholder?: string;
  enableLinkAnalysis?: boolean;
  locale?: AppLocale;
  copy?: SmartSearchCopy;
}

export function buildSmartSearchCopy(
  t: Awaited<ReturnType<typeof getDiscoveryI18n>>["t"],
): SmartSearchCopy {
  return {
    placeholder: t("SmartSearch.placeholder"),
    ariaLabel: t("SmartSearch.ariaLabel"),
    analyzing: t("SmartSearch.analyzing"),
    submitLink: t("SmartSearch.submitLink"),
    search: t("SmartSearch.search"),
    loading: t("SmartSearch.loading"),
    sommelierHint: t("SmartSearch.sommelierHint"),
    emptyHint: t("SmartSearch.emptyHint"),
    wineType: t("SmartSearch.wineType"),
    wineryType: t("SmartSearch.wineryType"),
    grapeType: t("SmartSearch.grapeType"),
    linkHelper: t("SmartSearch.linkHelper"),
    analysisFailed: t("SmartSearch.analysisFailed"),
    invalidResult: t("SmartSearch.invalidResult"),
    pendingReview: t("SmartSearch.pendingReview"),
    alreadyPending: t("SmartSearch.alreadyPending"),
  };
}

export async function SmartSearch(props: SmartSearchProps) {
  const { locale: requestLocale, t } = await getDiscoveryI18n();
  const { copy, locale, ...clientProps } = props;

  return (
    <SmartSearchClient
      {...clientProps}
      locale={locale ?? requestLocale}
      copy={copy ?? buildSmartSearchCopy(t)}
    />
  );
}
