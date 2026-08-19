import type { AppLocale } from "@/i18n/locale";
import type romanianMessages from "@/messages/ro.json";
import type { WineMessages } from "@/i18n/messages";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof romanianMessages & {
      Wine: WineMessages;
    };
  }
}
