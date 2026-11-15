import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { renderSVG } from "uqr";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/standings";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function PresentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      teams: true,
      activities: {
        include: {
          matches: true,
          placementPoints: true,
          categories: { include: { scores: true } },
        },
      },
    },
  });

  if (!event) notFound();

  // "Join in" corner: the address people are watching this on, the event
  // code, and a QR code that opens the event on their phone.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const joinQr = renderSVG(`${protocol}://${host}/events/${event.slug}`, {
    border: 1,
  });

  const rows = computeStandings(event.teams, event.activities);
  const hasAnyPoints = rows.some((r) => r.totalPoints > 0);

  return (
    <main className="min-h-screen bg-stone-950 text-white flex flex-col items-center px-10 py-12">
      <RealtimeRefresh eventSlug={event.slug} />

      <p className="text-amber-400 text-2xl font-medium tracking-wide uppercase">
        {event.name}
      </p>

      {!event.standingsVisible ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-4xl text-stone-500 font-medium text-center">
            Standings will be revealed soon…
          </p>
        </div>
      ) : rows.length === 0 || !hasAnyPoints ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-4xl text-stone-500 font-medium text-center">
            Let the games begin!
          </p>
        </div>
      ) : (
        <div className="w-full max-w-3xl mt-10 flex flex-col gap-4">
          {rows.map((row) => {
            const rank =
              1 + rows.filter((r) => r.totalPoints > row.totalPoints).length;
            const isLeader = rank === 1 && row.totalPoints > 0;
            return (
              <div
                key={row.teamId}
                className={`flex items-center justify-between rounded-2xl px-8 py-5 ${
                  isLeader ? "bg-amber-500 text-stone-950" : "bg-stone-900"
                }`}
              >
                <div className="flex items-center gap-6">
                  <span
                    className={`text-3xl font-bold w-12 ${
                      isLeader ? "" : "text-stone-500"
                    }`}
                  >
                    {rank}
                  </span>
                  <span className="text-3xl font-semibold">
                    {row.teamName}
                  </span>
                </div>
                <span className="text-4xl font-bold">{row.totalPoints}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-auto pt-12 w-full flex items-end justify-between gap-6">
        <div>
          <p className="text-xl text-stone-400">
            Follow along at{" "}
            <span className="font-medium text-white">{host}</span>
          </p>
          <p className="text-xl text-stone-400">
            Event code{" "}
            <span className="font-bold tracking-[0.2em] text-amber-400">
              {event.slug}
            </span>
          </p>
        </div>
        {/* A generated data: URL, so next/image has nothing to optimize. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(joinQr)}`}
          alt="QR code to open this event"
          width={144}
          height={144}
          className="rounded-xl bg-white p-1"
        />
      </div>
    </main>
  );
}
