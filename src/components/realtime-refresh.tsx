"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Listens for "refresh" pings on this event's broadcast channel (sent by
// notifyEventChanged in lib/realtime-server.ts after every change) and
// re-renders the page from the server. The ping itself carries no data.
export function RealtimeRefresh({ eventSlug }: { eventSlug: string }) {
  const router = useRouter();

  useEffect(() => {
    // Keep in sync with eventChannelName() in lib/realtime-server.ts.
    const channel = supabase
      .channel(`event:${eventSlug}`)
      .on("broadcast", { event: "refresh" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventSlug, router]);

  return null;
}
