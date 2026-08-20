"use client";

import { useEffect } from "react";
import { trackWineryEvent } from "@/lib/winery-analytics-client";

interface WineryPageViewTrackerProps {
  winerySlug: string;
}

export function WineryPageViewTracker({
  winerySlug,
}: WineryPageViewTrackerProps) {
  useEffect(() => {
    void trackWineryEvent(winerySlug, "page_view");
  }, [winerySlug]);

  return null;
}
