import type { Match } from "@prisma/client";
import { computeEliminationPlacements } from "@/lib/standings";
import { isRoundRobinComplete } from "@/lib/round-robin";
import { isWeightedScoringComplete } from "@/lib/weighted-score";

// How far along a game is, for the badges on the event page.
export type ActivityStatus =
  | "NOT_SET_UP" // no bracket/schedule generated, or no judging categories
  | "NOT_STARTED" // set up, nothing scored yet
  | "IN_PROGRESS"
  | "DONE";

type ActivityForStatus = {
  format: string;
  matches: Pick<
    Match,
    | "bracket"
    | "round"
    | "teamAId"
    | "teamBId"
    | "winnerId"
    | "scoreA"
    | "scoreB"
  >[];
  categories: { id: string; scores: { teamId: string }[] }[];
};

export function activityStatus(
  activity: ActivityForStatus,
  teams: { id: string }[],
): ActivityStatus {
  if (activity.format === "WEIGHTED_SCORE") {
    if (activity.categories.length === 0) return "NOT_SET_UP";
    const scores = activity.categories.flatMap((category) =>
      category.scores.map((s) => ({
        teamId: s.teamId,
        categoryId: category.id,
      })),
    );
    if (scores.length === 0) return "NOT_STARTED";
    return isWeightedScoringComplete(teams, activity.categories, scores)
      ? "DONE"
      : "IN_PROGRESS";
  }

  if (activity.matches.length === 0) return "NOT_SET_UP";

  const done =
    activity.format === "ELIMINATION"
      ? computeEliminationPlacements(activity.matches).size > 0
      : isRoundRobinComplete(activity.matches);
  if (done) return "DONE";

  // Byes get a winner at generation time but never a score, so "has a
  // score" is what tells us a match was actually played.
  const anyPlayed = activity.matches.some((m) => m.scoreA !== null);
  return anyPlayed ? "IN_PROGRESS" : "NOT_STARTED";
}
