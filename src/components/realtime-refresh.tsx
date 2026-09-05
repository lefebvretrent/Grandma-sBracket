"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();

  // Create a deterministic, stable string key (e.g. "Category-Match-PlacementPoint-Score")
  const tableKey = [...tables].sort().join("-");

  useEffect(() => {
    if (!tableKey) return;

    const channel = supabase.channel(`refresh:${tableKey}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          console.log(`[Realtime] Change on ${table}:`, payload);
          router.refresh();
        }
      );
    }

    channel.subscribe((status, err) => {
      if (err) console.error("[Realtime] Error:", err);
    });

    return () => {
      supabase.removeChannel(channel);
    };

    // Only depend on the primitive string key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  return null;
}