const STORAGE_KEY = "bracket-app:recent-events";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const MAX_ENTRIES = 10;

export type RecentEvent = { slug: string; name: string; visitedAt: number };

function readAll(): RecentEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEvent[];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed.filter((e) => e.visitedAt >= cutoff);
  } catch {
    return [];
  }
}

export function getRecentEvents(): RecentEvent[] {
  return readAll().sort((a, b) => b.visitedAt - a.visitedAt);
}

export function trackRecentEvent(slug: string, name: string) {
  if (typeof window === "undefined") return;
  const existing = readAll().filter((e) => e.slug !== slug);
  const updated = [{ slug, name, visitedAt: Date.now() }, ...existing].slice(
    0,
    MAX_ENTRIES
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage might be unavailable (private browsing, full quota) —
    // fine to just skip, this is a nice-to-have, not critical.
  }
}

export function removeRecentEvent(slug: string) {
  if (typeof window === "undefined") return;
  const remaining = readAll().filter((e) => e.slug !== slug);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore — same as above
  }
}
