import { createClient } from "@supabase/supabase-js";

// Server-side half of live updates. After a Server Action changes
// something, it calls notifyEventChanged(slug), which sends a tiny
// "refresh" ping on that event's broadcast channel. Every open page for
// that event (see components/realtime-refresh.tsx) hears it and
// re-fetches through the server, where the normal permission checks run.
//
// This replaces subscribing browsers to raw table changes
// (postgres_changes), which sent whole database rows, including the
// organizer's secret editToken, to every viewer, and fired for changes
// to *any* event rather than just the one on screen.
//
// The ping carries no data, so even if someone spoofs one, the worst
// they can do is make pages re-fetch.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export function eventChannelName(slug: string) {
  return `event:${slug}`;
}

export async function notifyEventChanged(slug: string) {
  const channel = supabase.channel(eventChannelName(slug));
  try {
    await channel.httpSend("refresh", { at: Date.now() }, { timeout: 2000 });
  } catch (err) {
    // Live refresh is a nice-to-have. Never fail the organizer's action
    // because the ping didn't go out; viewers still see the change on
    // their next navigation or reload.
    console.warn("[realtime] refresh ping failed:", err);
  } finally {
    supabase.removeChannel(channel);
  }
}
