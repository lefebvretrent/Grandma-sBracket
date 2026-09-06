"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getRecentEvents,
  removeRecentEvent,
  type RecentEvent,
} from "@/lib/recent-events";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function RecentEventsList() {
  // null = "haven't checked localStorage yet" — avoids a flash of empty
  // state before the client mounts.
  const [events, setEvents] = useState<RecentEvent[] | null>(null);

  useEffect(() => {
    setEvents(getRecentEvents());
  }, []);

  function handleRemove(slug: string) {
    removeRecentEvent(slug);
    setEvents((prev) => (prev ? prev.filter((e) => e.slug !== slug) : prev));
  }

  if (!events || events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent events</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {events.map((event) => (
          <div
            key={event.slug}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 hover:bg-stone-50 transition-colors"
          >
            <Link href={`/events/${event.slug}`} className="flex-1 min-w-0">
              <p className="font-medium text-stone-900 truncate">
                {event.name}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => handleRemove(event.slug)}
              className="shrink-0 text-stone-400 hover:text-stone-600 px-1"
              aria-label={`Remove ${event.name} from recent events`}
            >
              ✕
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
