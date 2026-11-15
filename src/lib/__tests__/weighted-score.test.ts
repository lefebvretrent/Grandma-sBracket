import { describe, expect, it } from "vitest";
import {
  computeWeightedPlacements,
  computeWeightedResults,
  isWeightedScoringComplete,
} from "@/lib/weighted-score";

const teams = [
  { id: "a", name: "Aces" },
  { id: "b", name: "Bears" },
  { id: "c", name: "Cubs" },
  { id: "d", name: "Ducks" },
];
const categories = [
  { id: "vocals", weight: 2 },
  { id: "stage", weight: 1 },
];
const score = (teamId: string, categoryId: string, value: number) => ({
  teamId,
  categoryId,
  value,
});

describe("computeWeightedResults", () => {
  it("multiplies each score by its category weight", () => {
    const results = computeWeightedResults(teams.slice(0, 2), categories, [
      score("a", "vocals", 8),
      score("a", "stage", 5),
      score("b", "vocals", 6),
      score("b", "stage", 10),
    ]);
    expect(results.map((r) => [r.teamId, r.total])).toEqual([
      ["b", 22],
      ["a", 21],
    ]);
  });

  it("treats a missing score as zero", () => {
    const [row] = computeWeightedResults(teams.slice(0, 1), categories, []);
    expect(row.total).toBe(0);
  });
});

describe("isWeightedScoringComplete", () => {
  it("needs a score for every team in every category", () => {
    const two = teams.slice(0, 2);
    const partial = [score("a", "vocals", 1), score("a", "stage", 1)];
    expect(isWeightedScoringComplete(two, categories, partial)).toBe(false);
    expect(
      isWeightedScoringComplete(two, categories, [
        ...partial,
        score("b", "vocals", 1),
        score("b", "stage", 1),
      ])
    ).toBe(true);
  });

  it("is never complete with no teams or no categories", () => {
    expect(isWeightedScoringComplete([], categories, [])).toBe(false);
    expect(isWeightedScoringComplete(teams, [], [])).toBe(false);
  });
});

describe("computeWeightedPlacements", () => {
  const full = (totals: Record<string, number>) =>
    Object.entries(totals).flatMap(([teamId, value]) => [
      score(teamId, "vocals", value),
      score(teamId, "stage", 0),
    ]);

  it("is empty until judging is complete", () => {
    expect(
      computeWeightedPlacements(teams, categories, [score("a", "vocals", 9)])
        .size
    ).toBe(0);
  });

  it("awards the podium only", () => {
    const placements = computeWeightedPlacements(
      teams,
      categories,
      full({ a: 9, b: 7, c: 5, d: 3 })
    );
    expect(Object.fromEntries(placements)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("lets tied teams share a placement and skips the next one", () => {
    const placements = computeWeightedPlacements(
      teams,
      categories,
      full({ a: 9, b: 9, c: 5, d: 3 })
    );
    expect(Object.fromEntries(placements)).toEqual({ a: 1, b: 1, c: 3 });
  });
});
