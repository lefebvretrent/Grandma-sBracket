import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const EDIT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function editCookieName(eventSlug: string) {
  return `edit_${eventSlug}`;
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
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    select: { editToken: true },
  });
  if (!event) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(editCookieName(eventSlug))?.value;
  return !!token && token === event.editToken;
}
