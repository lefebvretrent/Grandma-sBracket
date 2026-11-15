import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const EDIT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function editCookieName(eventSlug: string) {
  return `edit_${eventSlug}`;
}

// The organizer's secret. 32 random bytes from the OS's secure random
// generator (~256 bits), so it can't be guessed. The schema's
// @default(cuid()) is only a fallback: cuids are built from a timestamp
// and a counter and are meant to be unique, not secret.
export function generateEditToken(): string {
  return randomBytes(32).toString("base64url");
}

// Compares in constant time so the response time doesn't reveal how
// many leading characters of a guess were right.
function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Marks the current browser as the organizer for this event by setting
// a cookie containing its secret editToken. Called once, right after
// the event is created.
export async function grantEditAccess(eventSlug: string, editToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(editCookieName(eventSlug), editToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EDIT_COOKIE_MAX_AGE,
  });
}

// True only in the browser that created this event (or one that's had
// edit access granted to it). Safe to call from Server Components to
// decide what to render, and from Server Actions to decide what to
// allow.
export async function canEdit(eventSlug: string): Promise<boolean> {
  return (await getEditableEvent(eventSlug)) !== null;
}

// The event this browser is allowed to edit, or null. Server Actions
// should use this rather than canEdit: it hands back the event's real
// id, so every query that follows can be scoped to *this* event.
//
// Why that matters: Server Actions are public endpoints, and any extra
// arguments (teamId, matchId, ...) come from the client and can be
// swapped for anything. If an action only checked "is this person an
// editor of *some* event?" and then trusted a client-supplied id, an
// organizer of their own throwaway event could delete or rescore
// anyone else's. Scoping every lookup to the event returned here closes
// that hole.
export async function getEditableEvent(
  eventSlug: string
): Promise<{ id: string; slug: string } | null> {
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    select: { id: true, slug: true, editToken: true },
  });
  if (!event) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(editCookieName(eventSlug))?.value;
  if (!token || !tokensMatch(token, event.editToken)) return null;

  return { id: event.id, slug: event.slug };
}

// Turns the current browser into an organizer if `token` is this
// event's secret. This is what the organizer link does: it lets the
// organizer use a second device, share editing with a co-host, or get
// back in after losing the cookie. Returns false for a wrong token or an
// unknown event (deliberately the same answer for both).
export async function claimEditAccess(
  eventSlug: string,
  token: string
): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    select: { slug: true, editToken: true },
  });
  if (!event || !token || !tokensMatch(token, event.editToken)) return false;

  await grantEditAccess(event.slug, event.editToken);
  return true;
}

// The secret itself, but only for a browser that already holds it.
// Used to show the organizer their shareable organizer link.
export async function getEditTokenForEditor(
  eventSlug: string
): Promise<string | null> {
  if (!(await getEditableEvent(eventSlug))) return null;
  const cookieStore = await cookies();
  return cookieStore.get(editCookieName(eventSlug))?.value ?? null;
}
