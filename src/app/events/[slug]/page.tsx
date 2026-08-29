import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  addTeam,
  deleteTeam,
  randomizeSeeds,
  clearSeeds,
  setSeed,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    },
  });

  if (!event) notFound();

  const addTeamAction = addTeam.bind(null, event.id, event.slug);
  const randomizeAction = randomizeSeeds.bind(null, event.id, event.slug);
  const clearAction = clearSeeds.bind(null, event.id, event.slug);

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-medium text-stone-900">
            {event.name}
          </h1>
          <p className="text-sm text-stone-500">
            {event.teams.length} team{event.teams.length === 1 ? "" : "s"}{" "}
            added
          </p>
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
              <Button type="submit">Add team</Button>
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
                <Button type="submit" variant="secondary">
                  Randomize seeds
                </Button>
              </form>
              <form action={clearAction}>
                <Button type="submit" variant="ghost">
                  Clear seeds
                </Button>
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
                          name="seed"
                          defaultValue={team.seed ?? ""}
                          placeholder="#"
                          className="w-16 text-center"
                          aria-label={`Seed for ${team.name}`}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Save
                        </Button>
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
                        <Button type="submit" variant="ghost" size="sm">
                          Remove
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
