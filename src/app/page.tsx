import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Family games bracket app</CardTitle>
            <CardDescription>
              Create an event, add your teams, and set up brackets or scored
              games.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
