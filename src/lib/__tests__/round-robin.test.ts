import { describe, expect, it } from "vitest";
import {
  computeRoundRobinPlacements,
  computeRoundRobinResults,
  isRoundRobinComplete,
  roundRobinSchedule,
} from "@/lib/round-robin";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const teams = (n: number) => ids(n).map((id) => ({ id, name: id }));

function match(
  teamAId: string,
  teamBId: string,
  scoreA: number | null,
  scoreB: number | null
) {
  const played = scoreA !== null && scoreB !== null;
  return {
    teamAId,
    teamBId,
    scoreA,
    scoreB,
    winnerId: played ? (scoreA > scoreB ? teamAId : teamBId) : null,
  };
}

describe("roundRobinSchedule", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9, 16])(
    "has every pair of %i teams meet exactly once",
    (n) => {
      const schedule = roundRobinSchedule(ids(n));
      expect(schedule).toHaveLength((n * (n - 1)) / 2);

      const pairs = new Set(
        schedule.map((g) => [g.teamAId, g.teamBId].sort().join("-"))
      );
      expect(pairs.size).toBe(schedule.length);
      expect(schedule.every((g) => g.teamAId !== g.teamBId)).toBe(true);
    }
  );

  it.each([4, 5, 8, 9])(
    "never has a team play twice in the same round (%i teams)",
    (n) => {
      const byRound = new Map<number, string[]>();
      for (const g of roundRobinSchedule(ids(n))) {
        const playing = byRound.get(g.round) ?? [];
        playing.push(g.teamAId, g.teamBId);
        byRound.set(g.round, playing);
      }
      for (const playing of byRound.values()) {
        expect(new Set(playing).size).toBe(playing.length);
      }
    }
  );

  it("never schedules the phantom bye team", () => {
    const schedule = roundRobinSchedule(ids(5));
    expect(
      schedule.some((g) => g.teamAId === "BYE" || g.teamBId === "BYE")
    ).toBe(false);
  });
});

describe("round robin results", () => {
  it("ranks by wins, then point difference", () => {
    const matches = [
      match("t1", "t2", 10, 5), // t1 beats t2
      match("t1", "t3", 3, 7), // t3 beats t1
      match("t2", "t3", 9, 1), // t2 beats t3 (everyone 1-1)
    ];
    const results = computeRoundRobinResults(teams(3), matches);
    // Differences: t1 +1, t2 +3, t3 -4.
    expect(results.map((r) => r.teamId)).toEqual(["t2", "t1", "t3"]);
    expect(results[0]).toMatchObject({
      wins: 1,
      losses: 1,
      pointsFor: 14,
      pointsAgainst: 11,
    });
  });

  it("ignores matches that haven't been played", () => {
    const results = computeRoundRobinResults(teams(2), [
      match("t1", "t2", null, null),
    ]);
    expect(results.every((r) => r.wins === 0 && r.losses === 0)).toBe(true);
  });

  it("only counts as complete once every match has a winner", () => {
    expect(isRoundRobinComplete([])).toBe(false);
    expect(isRoundRobinComplete([match("t1", "t2", null, null)])).toBe(false);
    expect(isRoundRobinComplete([match("t1", "t2", 2, 1)])).toBe(true);
  });

  it("awards no placements until the schedule is finished", () => {
    const matches = [match("t1", "t2", 2, 1), match("t1", "t3", null, null)];
    expect(computeRoundRobinPlacements(teams(3), matches).size).toBe(0);
  });

  it("awards 1st, 2nd and 3rd only", () => {
    const matches = [
      match("t1", "t2", 5, 1),
      match("t1", "t3", 5, 1),
      match("t1", "t4", 5, 1),
      match("t2", "t3", 5, 1),
      match("t2", "t4", 5, 1),
      match("t3", "t4", 5, 1),
    ];
    const placements = computeRoundRobinPlacements(teams(4), matches);
    expect(Object.fromEntries(placements)).toEqual({ t1: 1, t2: 2, t3: 3 });
  });

  it("lets teams level on wins and difference share a placement", () => {
    // A perfect three-way circle: everyone 1-1 with a difference of 0.
    const matches = [
      match("t1", "t2", 5, 3),
      match("t2", "t3", 5, 3),
      match("t3", "t1", 5, 3),
    ];
    const placements = computeRoundRobinPlacements(teams(3), matches);
    expect(Object.fromEntries(placements)).toEqual({ t1: 1, t2: 1, t3: 1 });
  });
});
