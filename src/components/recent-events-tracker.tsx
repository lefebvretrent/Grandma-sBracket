"use client";

import { useEffect } from "react";
import { trackRecentEvent } from "@/lib/recent-events";

export function RecentEventsTracker({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  useEffect(() => {
    trackRecentEvent(slug, name);
  }, [slug, name]);

  return null;
}
