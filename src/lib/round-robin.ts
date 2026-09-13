import type { Match } from "@prisma/client";

// Standard round-robin schedule via the "circle method": fix one team,
// rotate the rest each round. Guarantees every team plays every other
// team exactly once, with no team playing twice in the same round. Odd
// team counts get a phantom "BYE" slot that simply produces no match
// for whichever real team draws it that round.
export function roundRobinSchedule(
  teamIds: string[]
): { round: number; teamAId: string; teamBId: string }[] {
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push("BYE");

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const schedule: { round: number; teamAId: string; teamBId: string }[] = [];

  const arr = [...ids];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        schedule.push({ round: r + 1, teamAId: a, teamBId: b });
      }
    }
    // Rotate everything except the fixed first slot.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return schedule;
}

export type RoundRobinRow = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

type MatchForStandings = Pick<
  Match,
  "teamAId" | "teamBId" | "scoreA" | "scoreB" | "winnerId"
>;

// Ranked by wins, then point differential, then name as a stable
// tiebreaker. Matches that haven't been played yet just don't count
// toward anyone's record.
export function computeRoundRobinResults(
  teams: { id: string; name: string }[],
  matches: MatchForStandings[]
): RoundRobinRow[] {
  const rows = new Map<string, RoundRobinRow>();
  teams.forEach((t) =>
    rows.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    })
  );

  for (const match of matches) {
    if (!match.teamAId || !match.teamBId || !match.winnerId) continue;
    const a = rows.get(match.teamAId);
    const b = rows.get(match.teamBId);
    if (!a || !b) continue;

    if (match.scoreA !== null) {
      a.pointsFor += match.scoreA;
      b.pointsAgainst += match.scoreA;
    }
    if (match.scoreB !== null) {
      b.pointsFor += match.scoreB;
      a.pointsAgainst += match.scoreB;
    }

    if (match.winnerId === match.teamAId) {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }

  return Array.from(rows.values()).sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    const diffX = x.pointsFor - x.pointsAgainst;
    const diffY = y.pointsFor - y.pointsAgainst;
    if (diffY !== diffX) return diffY - diffX;
    return x.teamName.localeCompare(y.teamName);
  });
}

export function isRoundRobinComplete(matches: MatchForStandings[]): boolean {
  return (
    matches.length > 0 &&
    matches.every((m) => !m.teamAId || !m.teamBId || !!m.winnerId)
  );
}

// Podium only (1st/2nd/3rd), matching PlacementPoint rows. Empty until
// every match has been played. Ties share a placement (two teams tied
// for 1st both get 1, next team is 3rd, not 2nd).
export function computeRoundRobinPlacements(
  teams: { id: string; name: string }[],
  matches: MatchForStandings[]
): Map<string, number> {
  const placements = new Map<string, number>();
  if (!isRoundRobinComplete(matches)) return placements;

  const results = computeRoundRobinResults(teams, matches);
  let lastKey: string | null = null;
  let lastPlacement = 0;

  results.forEach((row, i) => {
    const diff = row.pointsFor - row.pointsAgainst;
    const key = `${row.wins}:${diff}`;
    const placement = key === lastKey ? lastPlacement : i + 1;
    if (placement <= 3) placements.set(row.teamId, placement);
    lastKey = key;
    lastPlacement = placement;
  });

  return placements;
}
