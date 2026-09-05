import { ScoreForm } from "@/components/bracket/score-form";
import type { Match, Team } from "@prisma/client";

type MatchWithTeams = Match & {
  teamA: Team | null;
  teamB: Team | null;
};

export function MatchCard({
  match,
  eventSlug,
  activityId,
}: {
  match: MatchWithTeams;
  eventSlug: string;
  activityId: string;
}) {
  const needsScore =
    !match.isBye && match.teamAId && match.teamBId && !match.winnerId;

  if (needsScore) {
    return (
      <ScoreForm
        matchId={match.id}
        eventSlug={eventSlug}
        activityId={activityId}
        teamAName={match.teamA?.name}
        teamBName={match.teamB?.name}
      />
    );
  }

  return (
    <div className="w-64 rounded-lg border border-stone-200 bg-white p-4 flex flex-col gap-2">
      <TeamRow
        name={match.teamA?.name}
        score={match.scoreA}
        isWinner={!!match.winnerId && match.winnerId === match.teamAId}
      />
      <TeamRow
        name={match.teamB?.name}
        score={match.scoreB}
        isWinner={!!match.winnerId && match.winnerId === match.teamBId}
      />

      {match.isBye && (
        <p className="text-xs text-stone-400">
          Bye — advances automatically
        </p>
      )}
    </div>
  );
}

function TeamRow({
  name,
  score,
  isWinner,
}: {
  name?: string | null;
  score?: number | null;
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
        isWinner
          ? "bg-amber-50 text-amber-900 font-medium"
          : "text-stone-700"
      }`}
    >
      <span>{name ?? "TBD"}</span>
      {score !== null && score !== undefined && <span>{score}</span>}
    </div>
  );
}
