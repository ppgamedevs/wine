import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isAppLocale } from "@/i18n/locale";
import { getWineMessageFragment } from "@/i18n/messages";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = isAppLocale(requestedLocale)
    ? requestedLocale
    : DEFAULT_LOCALE;

  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: {
      ...messages,
      Wine: getWineMessageFragment(locale),
    },
  };
});
