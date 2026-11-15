import { describe, expect, it } from "vitest";
import {
  computeEliminationPlacements,
  computeStandings,
  placementLabel,
} from "@/lib/standings";

type Bracket = "WINNERS" | "LOSERS" | "GRAND_FINAL";

function match(
  bracket: Bracket,
  round: number,
  teamAId: string | null,
  teamBId: string | null,
  winnerId: string | null
) {
  return { bracket, round, teamAId, teamBId, winnerId, scoreA: null, scoreB: null };
}

const podium = [
  { placement: 1, points: 3 },
  { placement: 2, points: 2 },
  { placement: 3, points: 1 },
];

describe("computeEliminationPlacements", () => {
  it("is empty until the grand final is decided", () => {
    expect(
      computeEliminationPlacements([match("GRAND_FINAL", 1, "a", "b", null)])
        .size
    ).toBe(0);
  });

  it("takes 1st and 2nd from the grand final and 3rd from the losers final", () => {
    const placements = computeEliminationPlacements([
      match("LOSERS", 1, "c", "d", "c"),
      match("LOSERS", 2, "b", "c", "b"), // losers final: c is out in 3rd
      match("GRAND_FINAL", 1, "a", "b", "a"),
    ]);
    expect(Object.fromEntries(placements)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("uses the reset match when the grand final goes to a second game", () => {
    const placements = computeEliminationPlacements([
      match("GRAND_FINAL", 1, "a", "b", "b"),
      match("GRAND_FINAL", 2, "a", "b", "a"),
    ]);
    expect(Object.fromEntries(placements)).toEqual({ a: 1, b: 2 });
  });

  it("waits for the reset match before naming a champion", () => {
    const placements = computeEliminationPlacements([
      match("GRAND_FINAL", 1, "a", "b", "b"),
      match("GRAND_FINAL", 2, "a", "b", null),
    ]);
    expect(placements.size).toBe(0);
  });
});

describe("computeStandings", () => {
  const teams = [
    { id: "a", name: "Aces" },
    { id: "b", name: "Bears" },
    { id: "c", name: "Cubs" },
  ];

  it("adds placement points across games of every format", () => {
    const rows = computeStandings(teams, [
      {
        id: "bracket",
        format: "ELIMINATION",
        matches: [
          match("LOSERS", 1, "b", "c", "b"),
          match("GRAND_FINAL", 1, "a", "b", "a"),
        ],
        categories: [],
        placementPoints: podium,
      },
      {
        id: "karaoke",
        format: "WEIGHTED_SCORE",
        matches: [],
        categories: [
          {
            id: "vocals",
            weight: 1,
            scores: [
              { teamId: "a", value: 1 },
              { teamId: "b", value: 2 },
              { teamId: "c", value: 3 },
            ],
          },
        ],
        placementPoints: [
          { placement: 1, points: 10 },
          { placement: 2, points: 5 },
          { placement: 3, points: 0 },
        ],
      },
    ]);

    expect(rows.map((r) => [r.teamId, r.totalPoints])).toEqual([
      ["c", 11], // 3rd in the bracket (1) + 1st at karaoke (10)
      ["b", 7], // 2nd (2) + 2nd (5)
      ["a", 3], // 1st (3) + 3rd (0)
    ]);
    expect(rows[0].byActivity.get("karaoke")).toBe(10);
  });

  it("gives nothing for a game that isn't finished", () => {
    const rows = computeStandings(teams, [
      {
        id: "bracket",
        format: "ELIMINATION",
        matches: [match("GRAND_FINAL", 1, "a", "b", null)],
        categories: [],
        placementPoints: podium,
      },
    ]);
    expect(rows.every((r) => r.totalPoints === 0)).toBe(true);
  });
});

describe("placementLabel", () => {
  it("formats placements", () => {
    expect([1, 2, 3, 4].map(placementLabel)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
    ]);
  });
});
