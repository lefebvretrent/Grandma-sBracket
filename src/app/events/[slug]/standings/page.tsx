import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toggleStandingsVisibility } from "@/lib/actions";
import { canEdit } from "@/lib/permissions";
import { computeStandings } from "@/lib/standings";
import { SubmitButton } from "@/components/submit-button";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
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

  const isEditor = await canEdit(slug);
  const toggleAction = toggleStandingsVisibility.bind(null, event.id, slug);
  const rows = computeStandings(event.teams, event.activities);
  const scorableActivities = event.activities.filter(
    (a) => a.format === "ELIMINATION" || a.format === "WEIGHTED_SCORE"
  );

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <RealtimeRefresh
        tables={["Match", "Category", "Score", "PlacementPoint", "Event"]}
      />
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/events/${slug}`}
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              ← {event.name}
            </Link>
            <h1 className="text-2xl font-medium text-stone-900">
              Overall standings
            </h1>
          </div>
          {isEditor && (
            <form action={toggleAction}>
              <SubmitButton variant="secondary" size="sm">
                {event.standingsVisible ? "Hide standings" : "Show standings"}
              </SubmitButton>
            </form>
          )}
        </div>

        {!event.standingsVisible ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-stone-500">
                {isEditor ? (
                  <>
                    Standings are hidden right now — click{" "}
                    <span className="font-medium">Show standings</span> above
                    when you&apos;re ready to reveal the leaderboard.
                  </>
                ) : (
                  "Standings will be revealed by the organizer soon."
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                {scorableActivities.length === 0
                  ? "Add an elimination or judged-scoring game to start earning points."
                  : "Points earned from 1st/2nd/3rd place finishes across every game."}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {rows.length === 0 ? (
                <p className="text-sm text-stone-500">
                  Add some teams to see standings here.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-stone-500">
                      <th className="py-2 pr-4 font-medium">#</th>
                      <th className="py-2 pr-4 font-medium">Team</th>
                      {scorableActivities.map((a) => (
                        <th
                          key={a.id}
                          className="py-2 pr-4 font-medium text-center"
                        >
                          {a.name}
                        </th>
                      ))}
                      <th className="py-2 pl-4 font-medium text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const rank =
                        1 +
                        rows.filter((r) => r.totalPoints > row.totalPoints)
                          .length;
                      return (
                        <tr
                          key={row.teamId}
                          className={
                            rank === 1 && row.totalPoints > 0
                              ? "bg-amber-50"
                              : undefined
                          }
                        >
                          <td className="py-2 pr-4 text-stone-500">
                            {rank}
                          </td>
                          <td className="py-2 pr-4 font-medium text-stone-900">
                            {row.teamName}
                          </td>
                          {scorableActivities.map((a) => (
                            <td
                              key={a.id}
                              className="py-2 pr-4 text-center text-stone-600"
                            >
                              {row.byActivity.get(a.id) ?? "—"}
                            </td>
                          ))}
                          <td className="py-2 pl-4 text-right font-semibold text-stone-900">
                            {row.totalPoints}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
