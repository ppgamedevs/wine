"use client";

import type { WineryAnalyticsEventType } from "@/lib/schema";

export interface TrackWineryEventOptions {
  wineSlug?: string;
  wineryEventSlug?: string;
  path?: string;
  metadata?: Record<string, string | number | boolean>;
}

export async function trackWineryEvent(
  winerySlug: string,
  eventType: WineryAnalyticsEventType,
  options?: TrackWineryEventOptions,
): Promise<void> {
  try {
    await fetch(
      `/api/wineries/${encodeURIComponent(winerySlug)}/analytics`,
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        wineSlug: options?.wineSlug,
        wineryEventSlug: options?.wineryEventSlug,
        path: options?.path ?? window.location.pathname,
        referrer: document.referrer || undefined,
        metadata: options?.metadata,
      }),
      keepalive: true,
      },
    );
  } catch {
    // Analytics must not block navigation.
  }
}
