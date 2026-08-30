"use client";

import { useEffect } from "react";
import type { AppLocale } from "@/i18n/locale";

export function DocumentLocale({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
