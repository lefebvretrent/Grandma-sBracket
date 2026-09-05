"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentEvents, type RecentEvent } from "@/lib/recent-events";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function RecentEventsList() {
  // null = "haven't checked localStorage yet" — avoids a flash of empty
  // state before the client mounts.
  const [events, setEvents] = useState<RecentEvent[] | null>(null);

  useEffect(() => {
    setEvents(getRecentEvents());
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent events</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/events/${event.slug}`}
            className="rounded-lg border border-stone-200 bg-white p-3 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">{event.name}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
