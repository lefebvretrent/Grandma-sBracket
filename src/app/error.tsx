"use client"; // error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shown instead of a blank crash screen when a page fails to load, for
// example if the database can't be reached. "Try again" re-fetches the
// page without a full reload.
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center gap-4 text-center">
        <p className="text-sm font-medium text-red-600">Something went wrong</p>
        <h1 className="text-2xl font-medium text-stone-900">
          That didn&apos;t work.
        </h1>
        <p className="text-sm text-stone-500">
          Nothing was lost. Try again in a moment; if it keeps happening,
          the site may be having trouble reaching its database.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
