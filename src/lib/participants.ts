// Which teams are playing in a given game.
//
// Every team in the event plays every game unless the organizer has
// left it out of that game ("Teams in this game" on the game's page).
// We store the teams that are left out rather than the ones playing,
// so a team added later joins every game automatically.
export function playingTeams<T extends { id: string }>(
  teams: T[],
  activity: { excludedTeams?: { id: string }[] }
): T[] {
  const excluded = new Set((activity.excludedTeams ?? []).map((t) => t.id));
  if (excluded.size === 0) return teams;
  return teams.filter((team) => !excluded.has(team.id));
}

// Compares who should be playing with who is actually in the generated
// bracket or schedule. The two drift apart when a team is added to the
// event, or ticked/unticked for this game, after generating.
export function bracketDrift<T extends { id: string }>(
  playing: T[],
  matches: { teamAId: string | null; teamBId: string | null }[]
): { missing: T[]; extraIds: string[] } {
  const inMatches = new Set<string>();
  for (const match of matches) {
    if (match.teamAId) inMatches.add(match.teamAId);
    if (match.teamBId) inMatches.add(match.teamBId);
  }
  const playingIds = new Set(playing.map((t) => t.id));
  return {
    missing: playing.filter((t) => !inMatches.has(t.id)),
    extraIds: [...inMatches].filter((id) => !playingIds.has(id)),
  };
}
