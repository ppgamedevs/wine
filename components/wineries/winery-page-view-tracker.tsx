"use client";

import { useEffect } from "react";
import { trackWineryEvent } from "@/lib/winery-analytics-client";

interface WineryPageViewTrackerProps {
  wineryId: number;
}

export function WineryPageViewTracker({ wineryId }: WineryPageViewTrackerProps) {
  useEffect(() => {
    void trackWineryEvent(wineryId, "page_view");
  }, [wineryId]);

  return null;
}
