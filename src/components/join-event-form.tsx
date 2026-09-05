"use client";

import { useActionState } from "react";
import { joinEvent } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

export function JoinEventForm() {
  const [state, formAction] = useActionState(joinEvent, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <label
            htmlFor="code"
            className="text-sm font-medium text-stone-700"
          >
            Event code
          </label>
          <Input
			id="code"
			name="code"
			placeholder="e.g. A7K2F9"
			className="uppercase tracking-widest"
			maxLength={20}
			required
			/>
        </div>
        <SubmitButton variant="secondary">Join event</SubmitButton>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
