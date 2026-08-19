import "server-only";

import { createTranslator } from "next-intl";
import { getLocale } from "next-intl/server";
import enDiscovery from "@/messages/en/discovery.json";
import roDiscovery from "@/messages/ro/discovery.json";
import {
  DEFAULT_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@/i18n/locale";

const DISCOVERY_MESSAGES = {
  ro: roDiscovery,
  en: enDiscovery,
} as const;

export async function getDiscoveryI18n() {
  const requestedLocale = await getLocale();
  const locale: AppLocale = isAppLocale(requestedLocale)
    ? requestedLocale
    : DEFAULT_LOCALE;
  const messages = DISCOVERY_MESSAGES[locale];
  const t = createTranslator({ locale, messages });

  return { locale, t };
}
