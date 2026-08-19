import type { AppLocale } from "@/i18n/locale";
import englishWineMessages from "@/messages/en/wine.json";
import romanianWineMessages from "@/messages/ro/wine.json";

export type WineMessages = typeof romanianWineMessages;

const checkedEnglishWineMessages: WineMessages = englishWineMessages;

export function getWineMessageFragment(locale: AppLocale): WineMessages {
  return locale === "en"
    ? checkedEnglishWineMessages
    : romanianWineMessages;
}
