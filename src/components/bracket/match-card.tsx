import { ScoreForm } from "@/components/bracket/score-form";
import { EditableMatchResult } from "@/components/bracket/editable-match-result";
import { TeamRow } from "@/components/bracket/team-row";
import type { Match, Team } from "@prisma/client";

type MatchWithTeams = Match & {
  teamA: Team | null;
  teamB: Team | null;
};

export function MatchCard({
  match,
  eventSlug,
  activityId,
  isEditor,
}: {
  match: MatchWithTeams;
  eventSlug: string;
  activityId: string;
  isEditor: boolean;
}) {
  const needsScore =
    !match.isBye && match.teamAId && match.teamBId && !match.winnerId;
  const isDecided = !match.isBye && !!match.winnerId;

  if (needsScore && isEditor) {
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

  if (isDecided && isEditor) {
    return (
      <EditableMatchResult
        // Remounts (and so collapses back out of edit mode) once the
        // scores actually change after a successful save.
        key={`${match.id}-${match.scoreA}-${match.scoreB}`}
        match={match}
        eventSlug={eventSlug}
        activityId={activityId}
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
      {needsScore && !isEditor && (
        <p className="text-xs text-stone-400">Awaiting score</p>
      )}
    </div>
  );
}
