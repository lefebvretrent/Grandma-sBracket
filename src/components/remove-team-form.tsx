"use client";

import { useActionState } from "react";
import type { RemoveTeamState } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

// "Remove" button for a team. Asks first, and shows the server's reason
// if the team can't be removed (it's still in a bracket or schedule).
export function RemoveTeamForm({
  teamName,
  action,
}: {
  teamName: string;
  action: (prev: RemoveTeamState) => Promise<RemoveTeamState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <ConfirmSubmitButton
        confirmMessage={`Remove "${teamName}" from the event? Any judged scores it has are deleted too.`}
        variant="ghost"
        size="sm"
      >
        Remove
      </ConfirmSubmitButton>
      {state.error && (
        <p className="max-w-56 text-right text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
