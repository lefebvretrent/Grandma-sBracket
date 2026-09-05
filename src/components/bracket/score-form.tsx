"use client";

import { useActionState } from "react";
import { reportScore } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

export function ScoreForm({
  matchId,
  eventSlug,
  activityId,
  teamAName,
  teamBName,
}: {
  matchId: string;
  eventSlug: string;
  activityId: string;
  teamAName?: string | null;
  teamBName?: string | null;
}) {
  const action = reportScore.bind(null, matchId, eventSlug, activityId);
  const [state, formAction] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className="w-64 rounded-lg border border-stone-200 bg-white p-4 flex flex-col gap-3"
    >
      <div className="flex flex-col divide-y divide-stone-100 rounded-md border border-stone-200 overflow-hidden">
        <ScoreRow name="scoreA" teamName={teamAName} />
        <ScoreRow name="scoreB" teamName={teamBName} />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <SubmitButton size="sm" className="self-end">
        Save score
      </SubmitButton>
    </form>
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
