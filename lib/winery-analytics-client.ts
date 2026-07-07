"use client";

import type { WineryAnalyticsEventType } from "@/lib/schema";

export interface TrackWineryEventOptions {
  wineId?: number;
  wineryEventId?: number;
  path?: string;
  metadata?: Record<string, string | number | boolean>;
}

export async function trackWineryEvent(
  wineryId: number,
  eventType: WineryAnalyticsEventType,
  options?: TrackWineryEventOptions,
): Promise<void> {
  try {
    await fetch(`/api/wineries/${wineryId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        wineId: options?.wineId,
        wineryEventId: options?.wineryEventId,
        path: options?.path ?? window.location.pathname,
        referrer: document.referrer || undefined,
        metadata: options?.metadata,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics must not block navigation.
  }
}
