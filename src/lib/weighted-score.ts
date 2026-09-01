export type WeightedResultRow = {
  teamId: string;
  teamName: string;
  total: number;
  byCategory: Map<string, number>; // categoryId -> raw score
};

// Multiplies each team's raw score per category by that category's
// weight and sums them, sorted highest total first.
export function computeWeightedResults(
  teams: { id: string; name: string }[],
  categories: { id: string; weight: number }[],
  scores: { teamId: string; categoryId: string; value: number }[]
): WeightedResultRow[] {
  const scoreByKey = new Map<string, number>();
  scores.forEach((s) => scoreByKey.set(`${s.teamId}:${s.categoryId}`, s.value));

  return teams
    .map((team) => {
      const byCategory = new Map<string, number>();
      let total = 0;
      for (const category of categories) {
        const value = scoreByKey.get(`${team.id}:${category.id}`) ?? 0;
        byCategory.set(category.id, value);
        total += value * category.weight;
      }
      return { teamId: team.id, teamName: team.name, total, byCategory };
    })
    .sort((a, b) => b.total - a.total);
}

// True once every team has a recorded score for every category — we
// only call the results final (and award placement points) once
// judging is fully complete.
export function isWeightedScoringComplete(
  teams: { id: string }[],
  categories: { id: string }[],
  scores: { teamId: string; categoryId: string }[]
): boolean {
  if (teams.length === 0 || categories.length === 0) return false;
  const scored = new Set(scores.map((s) => `${s.teamId}:${s.categoryId}`));
  return teams.every((team) =>
    categories.every((category) => scored.has(`${team.id}:${category.id}`))
  );
}

// Podium only (1st/2nd/3rd), matching what elimination brackets support
// and what PlacementPoint rows exist for. Empty until scoring is
// complete. Ties share the same placement (e.g. two teams tied for 1st
// both get 1, and the next team is 3rd, not 2nd) rather than being
// arbitrarily split by sort order.
export function computeWeightedPlacements(
  teams: { id: string; name: string }[],
  categories: { id: string; weight: number }[],
  scores: { teamId: string; categoryId: string; value: number }[]
): Map<string, number> {
  const placements = new Map<string, number>();
  if (!isWeightedScoringComplete(teams, categories, scores)) return placements;

  const results = computeWeightedResults(teams, categories, scores);
  for (const row of results) {
    const rank = 1 + results.filter((r) => r.total > row.total).length;
    if (rank <= 3) placements.set(row.teamId, rank);
  }
  return placements;
}
