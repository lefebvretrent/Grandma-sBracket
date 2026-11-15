import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shown for any address that doesn't exist, including an event code
// that was mistyped or whose event has been deleted.
export default function NotFound() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center gap-4 text-center">
        <p className="text-sm font-medium text-amber-700">Not found</p>
        <h1 className="text-2xl font-medium text-stone-900">
          We couldn&apos;t find that page.
        </h1>
        <p className="text-sm text-stone-500">
          If you were opening an event, check the code for typos. It&apos;s
          also possible the organizer deleted the event.
        </p>
        <Button asChild>
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>
    </main>
  );
}
