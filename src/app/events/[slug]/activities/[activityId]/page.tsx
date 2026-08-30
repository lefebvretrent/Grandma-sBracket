import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateBracket } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MatchCard } from "@/components/bracket/match-card";
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
        <div key={round} className="flex flex-col gap-6 min-w-56">
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
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { teamA: true, teamB: true },
      },
    },
  });

  if (!activity || activity.event.slug !== slug) notFound();

  const generateAction = generateBracket.bind(null, activity.id, slug);
  const teamCount = activity.event.teams.length;
  const hasMatches = activity.matches.length > 0;

  const wbMatches = activity.matches.filter((m) => m.bracket === "WINNERS");
  const lbMatches = activity.matches.filter((m) => m.bracket === "LOSERS");
  const gfMatches = activity.matches.filter(
    (m) => m.bracket === "GRAND_FINAL"
  );

  const wbRounds = groupByRound(wbMatches);
  const lbRounds = groupByRound(lbMatches);

  const champion = gfMatches
    .slice()
    .sort((a, b) => b.round - a.round)[0]?.winnerId;
  const championName = champion
    ? (gfMatches.find((m) => m.teamAId === champion)?.teamA?.name ??
      gfMatches.find((m) => m.teamBId === champion)?.teamB?.name)
    : null;

  return (
    <main className="min-h-screen bg-stone-50 p-6">
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

        {activity.format !== "ELIMINATION" && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-stone-500">
                {activity.format === "ROUND_ROBIN"
                  ? "Round robin"
                  : "Judged scoring"}{" "}
                isn&apos;t built yet, it&apos;s coming in a future update.
              </p>
            </CardContent>
          </Card>
        )}

        {activity.format === "ELIMINATION" && (
          <>
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

            {championName && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <p className="text-lg font-medium text-amber-900">
                    🏆 {championName} is the champion!
                  </p>
                </CardContent>
              </Card>
            )}

            {hasMatches && (
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
                          className="flex flex-col gap-3 min-w-56"
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
          </>
        )}
      </div>
    </main>
  );
}
