// Plays whole brackets from start to finish against a real database, the
// same way an organizer would: generate, then score whichever match is
// ready until none are left.
//
// SAFETY: these tests create and delete events, so they only run when
// TEST_DATABASE_URL is set, and they use *that* database. They never
// touch the DATABASE_URL in your .env (which may be production). With no
// TEST_DATABASE_URL they are skipped.
import { afterAll, describe, expect, it, vi } from "vitest";

const testDatabaseUrl = vi.hoisted(() => {
  const url = process.env.TEST_DATABASE_URL;
  if (url) {
    process.env.DATABASE_URL = url;
    process.env.DIRECT_URL = url;
  }
  return url;
});

// The actions normally check the organizer's cookie, ping Supabase and
// tell Next.js to re-render. None of that exists in a test, so swap in
// stand-ins: every caller counts as the organizer, the rest do nothing.
vi.mock("@/lib/permissions", async () => {
  const { prisma } = await import("@/lib/prisma");
  return {
    generateEditToken: () => `test-${Math.random().toString(36).slice(2)}`,
    grantEditAccess: async () => {},
    canEdit: async () => true,
    getEditableEvent: async (slug: string) =>
      prisma.event.findUnique({
        where: { slug },
        select: { id: true, slug: true },
      }),
  };
});
vi.mock("@/lib/realtime-server", () => ({
  notifyEventChanged: async () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

import { prisma } from "@/lib/prisma";
import {
  editScore,
  generateBracket,
  generateRoundRobin,
  reportScore,
} from "@/lib/actions";
import { computeEliminationPlacements } from "@/lib/standings";

const createdEventIds: string[] = [];

// Small repeatable random number generator, so a failing run can be
// replayed exactly.
function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function setUp(teamCount: number, format: "ELIMINATION" | "ROUND_ROBIN") {
  const slug = `T${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const event = await prisma.event.create({
    data: {
      name: `Test ${teamCount} teams`,
      slug,
      editToken: `test-${slug}`,
      teams: {
        create: Array.from({ length: teamCount }, (_, i) => ({
          name: `Team ${i + 1}`,
          seed: i + 1,
        })),
      },
      activities: { create: [{ name: "Game", format }] },
    },
    include: { activities: true, teams: true },
  });
  createdEventIds.push(event.id);
  return { slug, activityId: event.activities[0].id, teams: event.teams };
}

function scores(scoreA: number, scoreB: number) {
  const data = new FormData();
  data.set("scoreA", String(scoreA));
  data.set("scoreB", String(scoreB));
  return data;
}

async function readyMatches(activityId: string) {
  return prisma.match.findMany({
    where: {
      activityId,
      winnerId: null,
      teamAId: { not: null },
      teamBId: { not: null },
    },
    orderBy: { id: "asc" },
  });
}

// Scores ready matches in a random order with random winners until the
// bracket has nothing left to play.
async function playToTheEnd(
  slug: string,
  activityId: string,
  random: () => number
) {
  for (let guard = 0; guard < 500; guard++) {
    const ready = await readyMatches(activityId);
    if (ready.length === 0) return;
    const match = ready[Math.floor(random() * ready.length)];
    const aWins = random() < 0.5;
    const result = await reportScore(
      match.id,
      slug,
      activityId,
      {},
      scores(aWins ? 2 : 1, aWins ? 1 : 2)
    );
    expect(result.error).toBeUndefined();
  }
  throw new Error("Bracket never finished");
}

describe.skipIf(!testDatabaseUrl)("double elimination, played end to end", () => {
  afterAll(async () => {
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    await prisma.$disconnect();
  });

  it.each([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 16, 17])(
    "finishes cleanly with %i teams",
    async (teamCount) => {
      // Three different random playthroughs per size.
      for (const seed of [1, 2, 3]) {
        const { slug, activityId, teams } = await setUp(
          teamCount,
          "ELIMINATION"
        );
        await generateBracket(activityId, slug);
        await playToTheEnd(slug, activityId, rng(teamCount * 100 + seed));

        const matches = await prisma.match.findMany({ where: { activityId } });

        // Nothing is left half-filled or unplayed.
        const stuck = matches.filter(
          (m) => !m.winnerId && (m.teamAId || m.teamBId)
        );
        expect(stuck).toEqual([]);

        // Every team was placed in the bracket.
        const placed = new Set(
          matches.flatMap((m) => [m.teamAId, m.teamBId]).filter(Boolean)
        );
        expect(placed.size).toBe(teamCount);

        // The defining rule of double elimination: the champion lost at
        // most once, and everyone else lost exactly twice.
        const losses = new Map<string, number>(teams.map((t) => [t.id, 0]));
        for (const m of matches) {
          if (m.isBye || !m.winnerId || !m.teamAId || !m.teamBId) continue;
          const loser = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
          losses.set(loser, (losses.get(loser) ?? 0) + 1);
        }
        const placements = computeEliminationPlacements(matches);
        const champion = [...placements].find(([, p]) => p === 1)?.[0];
        expect(champion).toBeDefined();
        for (const team of teams) {
          if (team.id === champion) {
            expect(losses.get(team.id)).toBeLessThanOrEqual(1);
          } else {
            expect(losses.get(team.id)).toBe(2);
          }
        }

        // A podium is always produced.
        expect([...placements.values()].sort()).toEqual(
          teamCount >= 3 ? [1, 2, 3] : [1, 2]
        );
      }
    },
    60_000
  );

  it("adds a reset match only when the losers-bracket champion wins the grand final", async () => {
    for (const lbChampionWins of [true, false]) {
      const { slug, activityId } = await setUp(2, "ELIMINATION");
      await generateBracket(activityId, slug);

      const [first] = await readyMatches(activityId);
      await reportScore(first.id, slug, activityId, {}, scores(2, 1));
      const [grandFinal] = await readyMatches(activityId);
      expect(grandFinal.bracket).toBe("GRAND_FINAL");
      // Slot A is the winners-bracket champion, slot B the losers'.
      await reportScore(
        grandFinal.id,
        slug,
        activityId,
        {},
        lbChampionWins ? scores(1, 2) : scores(2, 1)
      );

      const resets = await prisma.match.count({
        where: { activityId, bracket: "GRAND_FINAL", round: 2 },
      });
      expect(resets).toBe(lbChampionWins ? 1 : 0);
    }
  });

  it("rejects ties, blanks and scoring the same match twice", async () => {
    const { slug, activityId } = await setUp(4, "ELIMINATION");
    await generateBracket(activityId, slug);
    const [match] = await readyMatches(activityId);

    expect(
      (await reportScore(match.id, slug, activityId, {}, scores(3, 3))).error
    ).toMatch(/tied/);
    expect(
      (await reportScore(match.id, slug, activityId, {}, new FormData())).error
    ).toMatch(/whole-number/);

    expect(
      (await reportScore(match.id, slug, activityId, {}, scores(2, 1))).error
    ).toBeUndefined();
    expect(
      (await reportScore(match.id, slug, activityId, {}, scores(1, 2))).error
    ).toMatch(/already has a result/);
  });

  it("lets a score be corrected until a later match depends on it", async () => {
    const { slug, activityId } = await setUp(4, "ELIMINATION");
    await generateBracket(activityId, slug);
    const [semi1, semi2] = await prisma.match.findMany({
      where: { activityId, bracket: "WINNERS", round: 1 },
      orderBy: { position: "asc" },
    });

    await reportScore(semi1.id, slug, activityId, {}, scores(2, 1));

    // Flip the result: the other team should now be in the final.
    expect(
      (await editScore(semi1.id, slug, activityId, {}, scores(1, 2))).error
    ).toBeUndefined();
    const final = await prisma.match.findFirstOrThrow({
      where: { activityId, bracket: "WINNERS", round: 2 },
    });
    expect(final.teamAId).toBe(semi1.teamBId);

    // Once the final has been played, the semifinal is locked.
    await reportScore(semi2.id, slug, activityId, {}, scores(2, 1));
    await reportScore(final.id, slug, activityId, {}, scores(2, 1));
    expect(
      (await editScore(semi1.id, slug, activityId, {}, scores(2, 1))).error
    ).toMatch(/already affected later matches/);
  });

  it("regenerating wipes the old bracket", async () => {
    const { slug, activityId } = await setUp(4, "ELIMINATION");
    await generateBracket(activityId, slug);
    const [match] = await readyMatches(activityId);
    await reportScore(match.id, slug, activityId, {}, scores(2, 1));

    await generateBracket(activityId, slug);
    const played = await prisma.match.count({
      where: { activityId, scoreA: { not: null } },
    });
    expect(played).toBe(0);
  });
});

describe.skipIf(!testDatabaseUrl)("round robin, played end to end", () => {
  it.each([2, 3, 6, 7])("schedules and finishes with %i teams", async (n) => {
    const { slug, activityId } = await setUp(n, "ROUND_ROBIN");
    await generateRoundRobin(activityId, slug);

    expect(await prisma.match.count({ where: { activityId } })).toBe(
      (n * (n - 1)) / 2
    );
    await playToTheEnd(slug, activityId, rng(n));
    expect(await readyMatches(activityId)).toEqual([]);
  });
});
