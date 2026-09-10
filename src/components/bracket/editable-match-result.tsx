"use client";

import { useState } from "react";
import { EditScoreForm } from "@/components/bracket/edit-score-form";
import { TeamRow } from "@/components/bracket/team-row";

export function EditableMatchResult({
  match,
  eventSlug,
  activityId,
}: {
  match: {
    id: string;
    teamA: { name: string } | null;
    teamB: { name: string } | null;
    teamAId: string | null;
    teamBId: string | null;
    scoreA: number | null;
    scoreB: number | null;
    winnerId: string | null;
  };
  eventSlug: string;
  activityId: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditScoreForm
        matchId={match.id}
        eventSlug={eventSlug}
        activityId={activityId}
        teamAName={match.teamA?.name}
        teamBName={match.teamB?.name}
        initialScoreA={match.scoreA}
        initialScoreB={match.scoreB}
        onCancel={() => setEditing(false)}
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
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="self-end text-xs text-stone-400 hover:text-stone-600"
      >
        Edit score
      </button>
    </div>
  );
}
