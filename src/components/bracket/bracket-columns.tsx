import { MatchCard } from "@/components/bracket/match-card";
import type { Match, Team } from "@prisma/client";

type MatchWithTeams = Match & { teamA: Team | null; teamB: Team | null };

// Draws one bracket (winners or losers) as a tree: a column per round,
// with lines showing which matches feed which.
//
// How the lines stay aligned without measuring anything: every column
// is stretched to the same height and split into equal rows, one per
// match. A round with half as many matches therefore has rows twice as
// tall, so each match sits exactly level with the gap between the two
// matches that feed it. The connector lines are just borders drawn in
// the empty space to the right of each match.
//
// Two shapes of connection, worked out from the match counts:
//   - next round has half as many matches: pairs merge ( ⊐ shape)
//   - next round has the same number: straight across (losers bracket
//     "drop-in" rounds, where each survivor meets a team arriving from
//     the winners bracket)
export function BracketColumns({
  rounds,
  label,
  slug,
  activityId,
  isEditor,
}: {
  rounds: Map<number, MatchWithTeams[]>;
  label: (round: number, total: number) => string;
  slug: string;
  activityId: string;
  isEditor: boolean;
}) {
  const columns = Array.from(rounds.entries()).sort(([a], [b]) => a - b);
  const total = columns.length;
  const line = "pointer-events-none absolute border-stone-400";

  return (
    <div className="flex overflow-x-auto pb-4">
      {columns.map(([round, matches], columnIndex) => {
        const next = columns[columnIndex + 1]?.[1];
        const hasNext = !!next;
        const merges = hasNext && next.length * 2 === matches.length;
        const hasPrevious = columnIndex > 0;

        return (
          <div key={round} className="flex shrink-0 flex-col gap-3">
            <p className="text-sm font-medium text-stone-500">
              {label(round, total)}
            </p>
            <div
              className="grid flex-1"
              style={{
                gridTemplateRows: `repeat(${matches.length}, minmax(0, 1fr))`,
              }}
            >
              {matches.map((match, i) => (
                <div
                  key={match.id}
                  className={`relative flex items-center py-3 ${
                    hasNext ? "pr-8" : ""
                  }`}
                >
                  {/* line in from the previous round */}
                  {hasPrevious && (
                    <span
                      aria-hidden="true"
                      className={`${line} -left-4 top-1/2 w-4 border-t`}
                    />
                  )}

                  <MatchCard
                    match={match}
                    eventSlug={slug}
                    activityId={activityId}
                    isEditor={isEditor}
                  />

                  {/* line out toward the next round */}
                  {hasNext && (
                    <span
                      aria-hidden="true"
                      className={`${line} right-4 top-1/2 w-4 border-t`}
                    />
                  )}
                  {/* the vertical part that joins a pair of matches */}
                  {merges && (
                    <span
                      aria-hidden="true"
                      className={`${line} right-4 border-r ${
                        i % 2 === 0 ? "top-1/2 bottom-0" : "top-0 bottom-1/2"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
