"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  claimOrganizerAccess,
  type ClaimAccessState,
} from "@/lib/actions";

// Reads the secret from after the "#" in the organizer link, wipes it
// from the address bar, and asks the server to mark this browser as an
// organizer. On success the server sends us on to the event page.
export function ClaimAccess({ slug }: { slug: string }) {
  const [state, claim] = useActionState(
    (_prev: ClaimAccessState, token: string) =>
      claimOrganizerAccess(slug, token),
    {}
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = window.location.hash.slice(1);
    // Don't leave the secret sitting in the address bar or history.
    window.history.replaceState(null, "", window.location.pathname);
    startTransition(() => claim(token));
  }, [claim]);

  if (state.error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-red-600">{state.error}</p>
        <Link
          href={`/events/${slug}`}
          className="text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          View the event instead →
        </Link>
      </div>
    );
  }

  return <p className="text-sm text-stone-500">Signing you in as organizer…</p>;
}
