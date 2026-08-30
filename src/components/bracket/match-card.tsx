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

  if (needsScore) {
    return (
      <form
        action={reportScoreAction}
        className="w-64 rounded-lg border border-stone-200 bg-white p-4 flex flex-col gap-3"
      >
        <div className="flex flex-col divide-y divide-stone-100 rounded-md border border-stone-200 overflow-hidden">
          <ScoreRow name="scoreA" teamName={match.teamA?.name} />
          <ScoreRow name="scoreB" teamName={match.teamB?.name} />
        </div>
        <SubmitButton size="sm" className="self-end">
          Save score
        </SubmitButton>
      </form>
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

function ScoreRow({
  name,
  teamName,
}: {
  name: "scoreA" | "scoreB";
  teamName?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-stone-50 px-3 py-2.5">
      <span
        className="text-sm font-medium text-stone-800 truncate"
        title={teamName ?? ""}
      >
        {teamName ?? "TBD"}
      </span>
      <Input
        name={name}
        type="number"
        placeholder="0"
        required
        className="h-11 w-20 shrink-0 bg-white text-center text-lg font-semibold px-2"
        aria-label={`${teamName ?? "Team"} score`}
      />
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