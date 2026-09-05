import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  addTeam,
  deleteTeam,
  randomizeSeeds,
  clearSeeds,
  setSeed,
  createActivity,
} from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      teams: { orderBy: [{ seed: "asc" }, { createdAt: "asc" }] },
      activities: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!event) notFound();

  const addTeamAction = addTeam.bind(null, event.id, event.slug);
  const randomizeAction = randomizeSeeds.bind(null, event.id, event.slug);
  const clearAction = clearSeeds.bind(null, event.id, event.slug);
  const createActivityAction = createActivity.bind(null, event.id, event.slug);

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <RealtimeRefresh tables={["Team", "Activity"]} />
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">
              {event.name}
            </h1>
            <p className="text-sm text-stone-500">
              {event.teams.length} team{event.teams.length === 1 ? "" : "s"}{" "}
              added
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link
              href={`/events/${event.slug}/standings`}
              className="text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Overall standings →
            </Link>
            <Link
              href={`/events/${event.slug}/present`}
              target="_blank"
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Open presenter view ↗
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add a team</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={addTeamAction}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 flex flex-col gap-1.5">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-stone-700"
                >
                  Team name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. The Smashers"
                  required
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label
                  htmlFor="members"
                  className="text-sm font-medium text-stone-700"
                >
                  Members (optional)
                </label>
                <Input
                  id="members"
                  name="members"
                  placeholder="e.g. Grandma, Uncle Joe"
                />
              </div>
              <SubmitButton>Add team</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teams &amp; seeding</CardTitle>
            <CardDescription>
              Randomize the order, or type a seed number by hand for each
              team.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <form action={randomizeAction}>
                <SubmitButton variant="secondary">
                  Randomize seeds
                </SubmitButton>
              </form>
              <form action={clearAction}>
                <SubmitButton variant="ghost">Clear seeds</SubmitButton>
              </form>
            </div>

            {event.teams.length === 0 ? (
              <p className="text-sm text-stone-500">
                No teams yet, add your first team above.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {event.teams.map((team) => {
                  const setSeedAction = setSeed.bind(
                    null,
                    team.id,
                    event.slug
                  );
                  const deleteTeamAction = deleteTeam.bind(
                    null,
                    team.id,
                    event.slug
                  );
                  return (
                    <li
                      key={team.id}
                      className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3"
                    >
                      <form
                        action={setSeedAction}
                        className="flex items-center gap-2"
                      >
                        <Input
                          key={team.seed ?? "unseeded"}
                          name="seed"
                          defaultValue={team.seed ?? ""}
                          placeholder="#"
                          className="w-16 text-center"
                          aria-label={`Seed for ${team.name}`}
                        />
                        <SubmitButton variant="outline" size="sm">
                          Save
                        </SubmitButton>
                      </form>
                      <div className="flex-1">
                        <p className="font-medium text-stone-900">
                          {team.name}
                        </p>
                        {team.members && (
                          <p className="text-sm text-stone-500">
                            {team.members}
                          </p>
                        )}
                      </div>
                      <form action={deleteTeamAction}>
                        <SubmitButton variant="ghost" size="sm">
                          Remove
                        </SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Games</CardTitle>
            <CardDescription>
              Add a game like Badminton or Karaoke, then set it up as a
              bracket or a scored contest.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              action={createActivityAction}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 flex flex-col gap-1.5">
                <label
                  htmlFor="activity-name"
                  className="text-sm font-medium text-stone-700"
                >
                  Game name
                </label>
                <Input
                  id="activity-name"
                  name="name"
                  placeholder="e.g. Badminton"
                  required
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label
                  htmlFor="activity-format"
                  className="text-sm font-medium text-stone-700"
                >
                  Type
                </label>
                <select
                  id="activity-format"
                  name="format"
                  defaultValue="ELIMINATION"
                  className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 text-base text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <option value="ELIMINATION">Elimination bracket</option>
                  <option value="ROUND_ROBIN">
                    Round robin (coming soon)
                  </option>
                  <option value="WEIGHTED_SCORE">
                    Judged scoring (coming soon)
                  </option>
                </select>
              </div>
              <SubmitButton>Add game</SubmitButton>
            </form>

            {event.activities.length === 0 ? (
              <p className="text-sm text-stone-500">
                No games yet, add your first one above.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {event.activities.map((activity) => (
                  <li key={activity.id}>
                    <Link
                      href={`/events/${event.slug}/activities/${activity.id}`}
                      className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 hover:bg-stone-50 transition-colors"
                    >
                      <span className="font-medium text-stone-900">
                        {activity.name}
                      </span>
                      <span className="text-xs text-stone-500">
                        {activity.format === "ELIMINATION" &&
                          "Elimination bracket"}
                        {activity.format === "ROUND_ROBIN" && "Round robin"}
                        {activity.format === "WEIGHTED_SCORE" &&
                          "Judged scoring"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
