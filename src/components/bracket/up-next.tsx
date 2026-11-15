import { MatchCard } from "@/components/bracket/match-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { Match, Team } from "@prisma/client";

type MatchWithTeams = Match & { teamA: Team | null; teamB: Team | null };

// Every match that has both teams and no result yet, pulled out of the
// bracket into one list. On a phone this saves hunting sideways through
// the tree for the next match to score.
export function UpNext({
  items,
  slug,
  activityId,
  isEditor,
}: {
  items: { match: MatchWithTeams; label: string }[];
  slug: string;
  activityId: string;
  isEditor: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle>Up next</CardTitle>
        <CardDescription>
          {items.length === 1
            ? "1 match is ready to play."
            : `${items.length} matches are ready to play.`}
          {isEditor && " Enter a score here or in the bracket below."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        {items.map(({ match, label }) => (
          <div key={match.id} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-stone-500">{label}</p>
            <MatchCard
              match={match}
              eventSlug={slug}
              activityId={activityId}
              isEditor={isEditor}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
