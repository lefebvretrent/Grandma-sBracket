import { reportScore } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
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
  const reportScoreAction = reportScore.bind(
    null,
    match.id,
    eventSlug,
    activityId
  );
  const needsScore =
    !match.isBye && match.teamAId && match.teamBId && !match.winnerId;

  return (
    <div className="w-56 rounded-lg border border-stone-200 bg-white p-3 flex flex-col gap-2">
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

      {needsScore && (
        <form
          action={reportScoreAction}
          className="flex items-center gap-2 pt-1"
        >
          <Input
            name="scoreA"
            type="number"
            placeholder="Score"
            className="h-9 text-center px-2"
            aria-label={`${match.teamA?.name} score`}
            required
          />
          <span className="text-sm text-stone-400">–</span>
          <Input
            name="scoreB"
            type="number"
            placeholder="Score"
            className="h-9 text-center px-2"
            aria-label={`${match.teamB?.name} score`}
            required
          />
          <SubmitButton size="sm">Save</SubmitButton>
        </form>
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
