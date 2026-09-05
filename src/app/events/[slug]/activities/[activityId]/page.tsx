import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  generateBracket,
  setPlacementPoints,
  addCategory,
  deleteCategory,
  setWeightedScores,
} from "@/lib/actions";
import { computeEliminationPlacements, placementLabel } from "@/lib/standings";
import {
  computeWeightedResults,
  computeWeightedPlacements,
  isWeightedScoringComplete,
} from "@/lib/weighted-score";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MatchCard } from "@/components/bracket/match-card";
import { Input } from "@/components/ui/input";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { Match, Team } from "@prisma/client";

export const dynamic = "force-dynamic";

type MatchWithTeams = Match & { teamA: Team | null; teamB: Team | null };

function wbRoundLabel(round: number, totalRounds: number) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${round}`;
}

function lbRoundLabel(round: number, totalRounds: number) {
  return round === totalRounds ? "Losers Final" : `Losers Round ${round}`;
}

function groupByRound(matches: MatchWithTeams[]) {
  const rounds = new Map<number, MatchWithTeams[]>();
  for (const match of matches) {
    if (!rounds.has(match.round)) rounds.set(match.round, []);
    rounds.get(match.round)!.push(match);
  }
  return rounds;
}

function BracketColumns({
  rounds,
  label,
  slug,
  activityId,
}: {
  rounds: Map<number, MatchWithTeams[]>;
  label: (round: number, total: number) => string;
  slug: string;
  activityId: string;
}) {
  const total = rounds.size;
  return (
    <div className="flex gap-8 overflow-x-auto pb-4">
      {Array.from(rounds.entries()).map(([round, matches]) => (
        <div key={round} className="flex flex-col gap-6 min-w-64">
          <p className="text-sm font-medium text-stone-500">
            {label(round, total)}
          </p>
          <div className="flex flex-1 flex-col justify-around gap-6">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                eventSlug={slug}
                activityId={activityId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string; activityId: string }>;
}) {
  const { slug, activityId } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      event: { include: { teams: true } },
      placementPoints: { orderBy: { placement: "asc" } },
      categories: {
        orderBy: { name: "asc" },
        include: { scores: true },
      },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { teamA: true, teamB: true },
      },
    },
  });

  if (!activity || activity.event.slug !== slug) notFound();

  const teams = activity.event.teams;
  const teamCount = teams.length;
  const teamsById = new Map<string, string>(teams.map((t) => [t.id, t.name]));

  // --- Elimination bracket data ---
  const generateAction = generateBracket.bind(null, activity.id, slug);
  const hasMatches = activity.matches.length > 0;

  const wbMatches = activity.matches.filter((m) => m.bracket === "WINNERS");
  const lbMatches = activity.matches.filter((m) => m.bracket === "LOSERS");
  const gfMatches = activity.matches.filter(
    (m) => m.bracket === "GRAND_FINAL"
  );
  const wbRounds = groupByRound(wbMatches);
  const lbRounds = groupByRound(lbMatches);

  // --- Weighted (judged) scoring data ---
  const addCategoryAction = addCategory.bind(null, activity.id, slug);
  const setScoresAction = setWeightedScores.bind(null, activity.id, slug);
  const flatScores = activity.categories.flatMap((category) =>
    category.scores.map((s) => ({
      teamId: s.teamId,
      categoryId: category.id,
      value: s.value,
    }))
  );
  const weightedResults =
    activity.format === "WEIGHTED_SCORE"
      ? computeWeightedResults(teams, activity.categories, flatScores)
      : [];
  const weightedComplete = isWeightedScoringComplete(
    teams,
    activity.categories,
    flatScores
  );

  // --- Shared: placements + points, regardless of format ---
  let placements = new Map<string, number>();
  if (activity.format === "ELIMINATION") {
    placements = computeEliminationPlacements(activity.matches);
  } else if (activity.format === "WEIGHTED_SCORE") {
    placements = computeWeightedPlacements(
      teams,
      activity.categories,
      flatScores
    );
  }
  const placementRows = Array.from(placements.entries())
    .map(([teamId, placement]) => ({
      teamId,
      placement,
      teamName: teamsById.get(teamId) ?? "Unknown team",
    }))
    .sort((a, b) => a.placement - b.placement);

  const setPointsAction = setPlacementPoints.bind(null, activity.id, slug);
  const pointsByPlacement = new Map<number, number>(
    activity.placementPoints.map((p) => [p.placement, p.points])
  );
  const supportsPlacements =
    activity.format === "ELIMINATION" || activity.format === "WEIGHTED_SCORE";

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <RealtimeRefresh
        tables={["Match", "Category", "Score", "PlacementPoint"]}
      />
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div>
          <Link
            href={`/events/${slug}`}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            ← {activity.event.name}
          </Link>
          <h1 className="text-2xl font-medium text-stone-900">
            {activity.name}
          </h1>
        </div>

        {activity.format === "ROUND_ROBIN" && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-stone-500">
                Round robin isn&apos;t built yet, it&apos;s coming in a
                future update.
              </p>
            </CardContent>
          </Card>
        )}

        {activity.format === "ELIMINATION" && (
          <Card>
            <CardHeader>
              <CardTitle>Double-elimination bracket</CardTitle>
              <CardDescription>
                {teamCount < 2
                  ? "Add at least 2 teams to the event before generating a bracket."
                  : hasMatches
                    ? "Regenerating will reset any scores you've already entered."
                    : `Ready to generate a bracket for ${teamCount} teams. Every team gets a second chance in the losers bracket before the grand final.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={generateAction}>
                {hasMatches ? (
                  <ConfirmSubmitButton
                    confirmMessage="Regenerate the bracket? This clears any scores already entered."
                    variant="secondary"
                  >
                    Regenerate bracket
                  </ConfirmSubmitButton>
                ) : (
                  <SubmitButton disabled={teamCount < 2}>
                    Generate bracket
                  </SubmitButton>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {activity.format === "WEIGHTED_SCORE" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Add a category for each thing being judged. Give it a
                  higher weight if it should count for more.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <form
                  action={addCategoryAction}
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="category-name"
                      className="text-sm font-medium text-stone-700"
                    >
                      Category name
                    </label>
                    <Input
                      id="category-name"
                      name="name"
                      placeholder="e.g. Vocals"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="category-weight"
                      className="text-sm font-medium text-stone-700"
                    >
                      Weight
                    </label>
                    <Input
                      id="category-weight"
                      name="weight"
                      type="number"
                      step="0.5"
                      defaultValue="1"
                      className="w-24 text-center"
                    />
                  </div>
                  <SubmitButton>Add category</SubmitButton>
                </form>

                {activity.categories.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {activity.categories.map((category) => {
                      const deleteAction = deleteCategory.bind(
                        null,
                        category.id,
                        slug,
                        activity.id
                      );
                      return (
                        <li
                          key={category.id}
                          className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3"
                        >
                          <span className="text-sm text-stone-900">
                            {category.name}{" "}
                            <span className="text-stone-400">
                              (weight ×{category.weight})
                            </span>
                          </span>
                          <form action={deleteAction}>
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

            {activity.categories.length > 0 && teamCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Scores</CardTitle>
                  <CardDescription>
                    Enter each team&apos;s score per category. Totals update
                    automatically once you save.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <form
                    action={setScoresAction}
                    className="flex flex-col gap-4"
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-left text-stone-500">
                          <th className="py-2 pr-4 font-medium">Team</th>
                          {activity.categories.map((category) => (
                            <th
                              key={category.id}
                              className="py-2 px-2 font-medium text-center"
                            >
                              {category.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team) => (
                          <tr
                            key={team.id}
                            className="border-b border-stone-100 last:border-0"
                          >
                            <td className="py-2 pr-4 font-medium text-stone-900">
                              {team.name}
                            </td>
                            {activity.categories.map((category) => {
                              const existing = category.scores.find(
                                (s) => s.teamId === team.id
                              );
                              return (
                                <td
                                  key={category.id}
                                  className="py-2 px-2 text-center"
                                >
                                  <Input
                                    name={`score-${team.id}-${category.id}`}
                                    type="number"
                                    step="0.5"
                                    defaultValue={existing?.value ?? ""}
                                    className="w-20 mx-auto text-center"
                                    aria-label={`${team.name} ${category.name} score`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <SubmitButton className="self-end">
                      Save scores
                    </SubmitButton>
                  </form>
                </CardContent>
              </Card>
            )}

            {weightedResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Standings for this game</CardTitle>
                  {!weightedComplete && (
                    <CardDescription>
                      Provisional — not every team has a score in every
                      category yet.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {weightedResults.map((row, i) => (
                    <p key={row.teamId} className="text-sm text-stone-700">
                      <span className="font-medium text-stone-900">
                        {i + 1}. {row.teamName}
                      </span>{" "}
                      — {row.total.toFixed(1)} pts
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {supportsPlacements && (
          <Card>
            <CardHeader>
              <CardTitle>Points for this game</CardTitle>
              <CardDescription>
                How many overall-standings points 1st, 2nd, and 3rd place
                earn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={setPointsAction}
                className="flex flex-wrap items-end gap-4"
              >
                {[1, 2, 3].map((placement) => (
                  <div key={placement} className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`points-${placement}`}
                      className="text-sm font-medium text-stone-700"
                    >
                      {placementLabel(placement)} place
                    </label>
                    <Input
                      id={`points-${placement}`}
                      name={`points-${placement}`}
                      type="number"
                      step="0.5"
                      defaultValue={pointsByPlacement.get(placement) ?? 0}
                      className="w-24 text-center"
                    />
                  </div>
                ))}
                <SubmitButton variant="secondary">Save points</SubmitButton>
              </form>
            </CardContent>
          </Card>
        )}

        {placementRows.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 flex flex-col gap-1">
              {placementRows.map((row) => (
                <p key={row.teamId} className="text-amber-900">
                  <span className="font-medium">
                    {row.placement === 1 ? "🏆 " : ""}
                    {placementLabel(row.placement)}:
                  </span>{" "}
                  {row.teamName}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {activity.format === "ELIMINATION" && hasMatches && (
          <>
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">
                Winners bracket
              </h2>
              <BracketColumns
                rounds={wbRounds}
                label={wbRoundLabel}
                slug={slug}
                activityId={activity.id}
              />
            </div>

            {lbMatches.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-stone-900 mb-3">
                  Losers bracket
                </h2>
                <BracketColumns
                  rounds={lbRounds}
                  label={lbRoundLabel}
                  slug={slug}
                  activityId={activity.id}
                />
              </div>
            )}

            {gfMatches.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-stone-900 mb-3">
                  Grand final
                </h2>
                <div className="flex gap-8 overflow-x-auto pb-4">
                  {gfMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-col gap-3 min-w-64"
                    >
                      <p className="text-sm font-medium text-stone-500">
                        {match.round === 1
                          ? "Grand Final"
                          : "Grand Final — Reset"}
                      </p>
                      <MatchCard
                        match={match}
                        eventSlug={slug}
                        activityId={activity.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
