import type { Match } from "@prisma/client";

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
  byActivity: Map<string, number>; // activityId -> points earned
};

type ActivityForStandings = {
  id: string;
  format: string;
  matches: Pick<Match, "bracket" | "round" | "teamAId" | "teamBId" | "winnerId">[];
  placementPoints: { placement: number; points: number }[];
};

// Sums placement points across every activity for every team, sorted
// highest first. Activities with no decided result yet just contribute
// zero for everyone.
export function computeStandings(
  teams: { id: string; name: string }[],
  activities: ActivityForStandings[]
): StandingsRow[] {
  const totals = new Map<string, number>();
  const byActivity = new Map<string, Map<string, number>>();
  teams.forEach((t) => totals.set(t.id, 0));

  for (const activity of activities) {
    if (activity.format !== "ELIMINATION") continue;

    const placements = computeEliminationPlacements(activity.matches);
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
      byActivity: byActivity.get(team.id) ?? new Map<string, number>(),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}