import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type TeamLite = { id: string; name: string };

// Organizer-only checklist of which teams play in this game.
export function ActivityTeamsCard({
  teams,
  playingIds,
  hasMatches,
  action,
}: {
  teams: TeamLite[];
  playingIds: Set<string>;
  hasMatches: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams in this game</CardTitle>
        <CardDescription>
          Untick any team that is sitting this game out.
          {hasMatches &&
            " Changes apply the next time you regenerate, which clears the scores entered so far."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {teams.map((team) => (
              <li key={team.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900">
                  <input
                    type="checkbox"
                    name="team"
                    value={team.id}
                    defaultChecked={playingIds.has(team.id)}
                    className="h-5 w-5 accent-amber-600"
                  />
                  {team.name}
                </label>
              </li>
            ))}
          </ul>
          <SubmitButton variant="secondary" className="self-start">
            Save teams
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

// Warns when the generated bracket or schedule no longer matches the
// teams that should be playing.
export function BracketDriftNotice({
  missing,
  extra,
  isEditor,
  noun,
}: {
  missing: TeamLite[];
  extra: TeamLite[];
  isEditor: boolean;
  noun: "bracket" | "schedule";
}) {
  if (missing.length === 0 && extra.length === 0) return null;
  const names = (list: TeamLite[]) => list.map((t) => t.name).join(", ");

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6 flex flex-col gap-1 text-sm text-red-900">
        <p className="font-medium">
          This {noun} is out of date with the team list.
        </p>
        {missing.length > 0 && (
          <p>
            Not in the {noun} yet: {names(missing)}.
          </p>
        )}
        {extra.length > 0 && (
          <p>
            Still in the {noun} but no longer playing this game:{" "}
            {names(extra)}.
          </p>
        )}
        <p>
          {isEditor
            ? `Regenerate the ${noun} to fix this (that clears the scores entered so far), or change "Teams in this game" back.`
            : "The organizer needs to regenerate it."}
        </p>
      </CardContent>
    </Card>
  );
}
