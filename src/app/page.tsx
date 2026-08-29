import Link from "next/link";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <main className="min-h-screen bg-stone-50 relative overflow-hidden flex items-center justify-center p-6">
      {/* Faint bracket-line watermark, purely decorative */}
      <svg
        className="absolute inset-0 h-full w-full text-amber-200/60"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 600"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M40 120 H160 M160 120 V220 H240 M40 220 H160 M40 320 H160 M160 320 V220"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M760 480 H640 M640 480 V380 H560 M760 380 H640 M760 280 H640 M640 280 V380"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>

      <div className="relative max-w-md w-full flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            <Trophy className="h-3.5 w-3.5" />
            Family field day, sorted
          </span>
          <h1 className="text-3xl font-medium tracking-tight text-stone-900">
            Brackets made so easy,{" "}
            <span className="text-amber-600">even your grandma</span> could
            do it.
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Button asChild size="lg" className="w-full">
              <Link href="/events/new">Create an event</Link>
            </Button>
          </CardContent>
        </Card>

        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent events</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="rounded-lg border border-stone-200 bg-white p-3 hover:bg-stone-50 transition-colors"
                >
                  <p className="font-medium text-stone-900">{event.name}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
