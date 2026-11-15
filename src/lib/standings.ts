import type { Match } from "@prisma/client";
import {
  computeWeightedPlacements,
  computeWeightedResults,
} from "@/lib/weighted-score";
import { computeRoundRobinPlacements } from "@/lib/round-robin";

// Works out 1st/2nd/3rd place for a completed double-elimination
// bracket. Returns an empty map until the grand final has a winner.
// 1st and 2nd come from the grand final; 3rd is whoever loses the
// losers-bracket final. We don't attempt 4th place and beyond yet.
export function computeEliminationPlacements(
  matches: Pick<Match, "bracket" | "round" | "teamAId" | "teamBId" | "winnerId">[]
): Map<string, number> {
  const placements = new Map<string, number>();

  const grandFinals = matches
    .filter((m) => m.bracket === "GRAND_FINAL")
    .sort((a, b) => b.round - a.round);
  const finalMatch = grandFinals[0];
  if (!finalMatch?.winnerId) return placements;

  const championId = finalMatch.winnerId;
  const runnerUpId =
    finalMatch.teamAId === championId
      ? finalMatch.teamBId
      : finalMatch.teamAId;

  placements.set(championId, 1);
  if (runnerUpId) placements.set(runnerUpId, 2);

  const losersMatches = matches.filter((m) => m.bracket === "LOSERS");
  if (losersMatches.length > 0) {
    const lastRound = Math.max(...losersMatches.map((m) => m.round));
    const lbFinal = losersMatches.find((m) => m.round === lastRound);
    if (lbFinal?.winnerId) {
      const thirdId =
        lbFinal.teamAId === lbFinal.winnerId
          ? lbFinal.teamBId
          : lbFinal.teamAId;
      if (thirdId) placements.set(thirdId, 3);
    }
  }

  return placements;
}

export function placementLabel(placement: number) {
  if (placement === 1) return "1st";
  if (placement === 2) return "2nd";
  if (placement === 3) return "3rd";
  return `${placement}th`;
}

export type StandingsRow = {
  teamId: string;
  teamName: string;
  totalPoints: number;
  // Tiebreaker: everything this team actually scored across all games
  // (match scores in brackets and round robins, weighted totals in
  // judged games). Only used to separate teams level on totalPoints.
  pointsScored: number;
  byActivity: Map<string, number>; // activityId -> points earned
};

// Where a team sits on the leaderboard: 1 + the number of teams strictly
// ahead of it. A team is ahead if it has more standings points, or the
// same standings points and more points scored. Teams level on both
// still share a rank.
export function standingsRank(rows: StandingsRow[], row: StandingsRow) {
  return (
    1 +
    rows.filter(
      (r) =>
        r.totalPoints > row.totalPoints ||
        (r.totalPoints === row.totalPoints &&
          r.pointsScored > row.pointsScored)
    ).length
  );
}

type ActivityForStandings = {
  id: string;
  format: string;
  matches: Pick<
    Match,
    "bracket" | "round" | "teamAId" | "teamBId" | "winnerId" | "scoreA" | "scoreB"
  >[];
  categories: {
    id: string;
    weight: number;
    scores: { teamId: string; value: number }[];
  }[];
  placementPoints: { placement: number; points: number }[];
};

// Sums placement points across every activity for every team, sorted
// highest first. Activities with no decided result yet just contribute
// zero for everyone. Teams level on placement points are ordered by
// total points scored (see StandingsRow.pointsScored).
export function computeStandings(
  teams: { id: string; name: string }[],
  activities: ActivityForStandings[]
): StandingsRow[] {
  const totals = new Map<string, number>();
  const byActivity = new Map<string, Map<string, number>>();
  const scored = new Map<string, number>();
  teams.forEach((t) => totals.set(t.id, 0));
  const addScored = (teamId: string | null, points: number | null) => {
    if (!teamId || points === null || !totals.has(teamId)) return;
    scored.set(teamId, (scored.get(teamId) ?? 0) + points);
  };

  for (const activity of activities) {
    let placements: Map<string, number>;

    if (activity.format === "ELIMINATION") {
      placements = computeEliminationPlacements(activity.matches);
    } else if (activity.format === "WEIGHTED_SCORE") {
      const flatScores = activity.categories.flatMap((category) =>
        category.scores.map((s) => ({
          teamId: s.teamId,
          categoryId: category.id,
          value: s.value,
        }))
      );
      placements = computeWeightedPlacements(
        teams,
        activity.categories,
        flatScores
      );
      for (const row of computeWeightedResults(
        teams,
        activity.categories,
        flatScores
      )) {
        addScored(row.teamId, row.total);
      }
    } else if (activity.format === "ROUND_ROBIN") {
      placements = computeRoundRobinPlacements(teams, activity.matches);
    } else {
      continue;
    }

    if (activity.format !== "WEIGHTED_SCORE") {
      for (const match of activity.matches) {
        addScored(match.teamAId, match.scoreA);
        addScored(match.teamBId, match.scoreB);
      }
    }

    const pointsByPlacement = new Map(
      activity.placementPoints.map((p) => [p.placement, p.points])
    );

    for (const [teamId, placement] of placements) {
      const points = pointsByPlacement.get(placement) ?? 0;
      totals.set(teamId, (totals.get(teamId) ?? 0) + points);

      if (!byActivity.has(teamId)) byActivity.set(teamId, new Map());
      byActivity.get(teamId)!.set(activity.id, points);
    }
  }

  return teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      totalPoints: totals.get(team.id) ?? 0,
      pointsScored: scored.get(team.id) ?? 0,
      byActivity: byActivity.get(team.id) ?? new Map<string, number>(),
    }))
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.pointsScored - a.pointsScored ||
        a.teamName.localeCompare(b.teamName)
    );
}
