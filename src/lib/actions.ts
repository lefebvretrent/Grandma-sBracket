"use server";

import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/join-code";
import { nextPowerOfTwo, seedOrder } from "@/lib/bracket";
import { roundRobinSchedule } from "@/lib/round-robin";
import { playingTeams } from "@/lib/participants";
import {
  generateEditToken,
  getEditableEvent,
  grantEditAccess,
} from "@/lib/permissions";
import { notifyEventChanged } from "@/lib/realtime-server";
import {
  LIMITS,
  isActivityFormat,
  parseIntInRange,
  parseNumberInRange,
  readText,
} from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export async function createEvent(formData: FormData) {
  const name = readText(formData, "name", LIMITS.eventName);
  if (!name) throw new Error("Event name is required");

  let slug = generateJoinCode();
  // Practically never collides at 6 chars, but cheap to guard anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing) break;
    slug = generateJoinCode();
  }

  const event = await prisma.event.create({
    data: { name, slug, editToken: generateEditToken() },
  });
  await grantEditAccess(slug, event.editToken);

  redirect(`/events/${slug}`);
}

export async function deleteEvent(eventSlug: string) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  await prisma.event.delete({ where: { id: event.id } });
  await notifyEventChanged(eventSlug);
  redirect("/");
}

export type JoinEventState = { error?: string };

export async function joinEvent(
  _prevState: JoinEventState,
  formData: FormData
): Promise<JoinEventState> {
  const raw = readText(formData, "code", LIMITS.joinCode);
  if (!raw) return { error: "Enter an event code." };

  // Be forgiving if someone pastes the full link, types lowercase, or
  // adds stray spaces.
  const slug = raw.toUpperCase().split("/").filter(Boolean).pop() ?? raw;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return { error: "We couldn't find an event with that code." };
  }

  redirect(`/events/${slug}`);
}

export async function addTeam(eventSlug: string, formData: FormData) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  const name = readText(formData, "name", LIMITS.teamName);
  const members = readText(formData, "members", LIMITS.teamMembers) || null;
  if (!name) return;

  const teamCount = await prisma.team.count({ where: { eventId: event.id } });
  if (teamCount >= LIMITS.teamsPerEvent) return;

  await prisma.team.create({ data: { name, members, eventId: event.id } });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
}

export type RemoveTeamState = { error?: string };

// Removing a team that's already in a bracket or schedule is refused.
// The database would blank that team out of its matches, leaving them
// with one side empty and no winner, so the game could never finish.
export async function deleteTeam(
  teamId: string,
  eventSlug: string,
  _prevState: RemoveTeamState
): Promise<RemoveTeamState> {
  void _prevState;
  const event = await getEditableEvent(eventSlug);
  if (!event) return { error: "Only the event organizer can remove teams." };

  const team = await prisma.team.findFirst({
    where: { id: teamId, eventId: event.id },
    select: { name: true },
  });
  if (!team) return {};

  const gamesUsingTeam = await prisma.activity.findMany({
    where: {
      eventId: event.id,
      matches: { some: { OR: [{ teamAId: teamId }, { teamBId: teamId }] } },
    },
    select: { name: true },
    orderBy: { createdAt: "asc" },
  });
  if (gamesUsingTeam.length > 0) {
    const games = gamesUsingTeam.map((g) => g.name).join(", ");
    return {
      error: `${team.name} is already in: ${games}. Untick it under "Teams in this game" there and regenerate, or delete those games, then remove it.`,
    };
  }

  // deleteMany + eventId so a teamId from another event matches nothing.
  await prisma.team.deleteMany({ where: { id: teamId, eventId: event.id } });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
  return {};
}

// Shuffles all teams in the event and assigns seeds 1..N based on the
// shuffled order. Simple Fisher-Yates so every ordering is equally likely.
export async function randomizeSeeds(eventSlug: string) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  const teams = await prisma.team.findMany({ where: { eventId: event.id } });

  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  await prisma.$transaction(
    shuffled.map((team, i) =>
      prisma.team.update({ where: { id: team.id }, data: { seed: i + 1 } })
    )
  );
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
}

export async function clearSeeds(eventSlug: string) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  await prisma.team.updateMany({
    where: { eventId: event.id },
    data: { seed: null },
  });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
}

export async function setSeed(
  teamId: string,
  eventSlug: string,
  formData: FormData
) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  // Blank (or anything that isn't a whole number 1-999) clears the seed.
  // The column is an Int, so a decimal used to crash the request.
  const seed = parseIntInRange(formData.get("seed"), 1, LIMITS.seedMax);

  await prisma.team.updateMany({
    where: { id: teamId, eventId: event.id },
    data: { seed },
  });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
}

// --- Activities ---

// Loads an activity only if it belongs to the given event. Every action
// that takes an activityId from the client goes through this.
async function findActivityInEvent(activityId: string, eventId: string) {
  return prisma.activity.findFirst({
    where: { id: activityId, eventId },
    select: { id: true },
  });
}

export async function createActivity(eventSlug: string, formData: FormData) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  const name = readText(formData, "name", LIMITS.activityName);
  const format = String(formData.get("format") || "ELIMINATION");
  if (!name || !isActivityFormat(format)) return;

  const activityCount = await prisma.activity.count({
    where: { eventId: event.id },
  });
  if (activityCount >= LIMITS.activitiesPerEvent) return;

  await prisma.activity.create({
    data: {
      name,
      format,
      eventId: event.id,
      // Default 3/2/1 for 1st/2nd/3rd — editable afterward per activity.
      placementPoints: {
        create: [
          { placement: 1, points: 3 },
          { placement: 2, points: 2 },
          { placement: 3, points: 1 },
        ],
      },
    },
  });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
}

// Cascades cleanly via Prisma's onDelete: Cascade — removes this
// activity's matches, categories, scores, and placement points too.
export async function deleteActivity(activityId: string, eventSlug: string) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  await prisma.activity.deleteMany({
    where: { id: activityId, eventId: event.id },
  });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

// Saves the "Teams in this game" checklist. Ticked teams play; every
// other team in the event is recorded as sitting this game out. An
// existing bracket or schedule isn't touched: the game's page shows a
// warning until the organizer regenerates it.
export async function setActivityTeams(
  activityId: string,
  eventSlug: string,
  formData: FormData
) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;
  if (!(await findActivityInEvent(activityId, event.id))) return;

  // Only ids of this event's own teams count; anything else is ignored.
  const ticked = new Set(formData.getAll("team").map(String));
  const teams = await prisma.team.findMany({
    where: { eventId: event.id },
    select: { id: true },
  });
  const excluded = teams.filter((team) => !ticked.has(team.id));

  await prisma.activity.update({
    where: { id: activityId },
    data: { excludedTeams: { set: excluded.map(({ id }) => ({ id })) } },
  });

  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

export async function setPlacementPoints(
  activityId: string,
  eventSlug: string,
  formData: FormData
) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;
  if (!(await findActivityInEvent(activityId, event.id))) return;

  const entries = [1, 2, 3].map((placement) => {
    const points = parseNumberInRange(
      formData.get(`points-${placement}`),
      0,
      LIMITS.placementPointsMax
    );
    return { placement, points: points ?? 0 };
  });

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.placementPoint.upsert({
        where: {
          activityId_placement: { activityId, placement: entry.placement },
        },
        create: {
          activityId,
          placement: entry.placement,
          points: entry.points,
        },
        update: { points: entry.points },
      })
    )
  );

  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

// --- Standings ---

export async function toggleStandingsVisibility(eventSlug: string) {
  const editable = await getEditableEvent(eventSlug);
  if (!editable) return;

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: editable.id },
  });
  await prisma.event.update({
    where: { id: editable.id },
    data: { standingsVisible: !event.standingsVisible },
  });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

// --- Weighted (judged) scoring ---

export async function addCategory(
  activityId: string,
  eventSlug: string,
  formData: FormData
) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;
  if (!(await findActivityInEvent(activityId, event.id))) return;

  const name = readText(formData, "name", LIMITS.categoryName);
  const weight =
    parseNumberInRange(formData.get("weight"), 0, LIMITS.categoryWeightMax) ??
    1;
  if (!name) return;

  const categoryCount = await prisma.category.count({ where: { activityId } });
  if (categoryCount >= LIMITS.categoriesPerActivity) return;

  await prisma.category.create({ data: { name, weight, activityId } });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
}

export async function deleteCategory(
  categoryId: string,
  eventSlug: string,
  activityId: string
) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  await prisma.category.deleteMany({
    where: { id: categoryId, activity: { id: activityId, eventId: event.id } },
  });
  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

// One form on the activity page submits every team/category score box
// at once, named "score-{teamId}-{categoryId}". Blank boxes are left
// untouched rather than zeroed out, so judges can fill this in over
// several passes.
export async function setWeightedScores(
  activityId: string,
  eventSlug: string,
  formData: FormData
) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, eventId: event.id },
    include: {
      event: { include: { teams: true } },
      excludedTeams: { select: { id: true } },
      categories: true,
    },
  });
  if (!activity) return;

  const upserts = [];
  for (const team of playingTeams(activity.event.teams, activity)) {
    for (const category of activity.categories) {
      // Blank or invalid boxes are skipped, not zeroed.
      const value = parseNumberInRange(
        formData.get(`score-${team.id}-${category.id}`),
        -LIMITS.judgedScoreMax,
        LIMITS.judgedScoreMax
      );
      if (value === null) continue;

      upserts.push(
        prisma.score.upsert({
          where: {
            teamId_categoryId: { teamId: team.id, categoryId: category.id },
          },
          create: { teamId: team.id, categoryId: category.id, value },
          update: { value },
        })
      );
    }
  }

  if (upserts.length > 0) {
    await prisma.$transaction(upserts);
  }

  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

// --- Round robin ---

export async function generateRoundRobin(
  activityId: string,
  eventSlug: string
) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, eventId: event.id },
    include: {
      event: { include: { teams: true } },
      excludedTeams: { select: { id: true } },
    },
  });
  if (!activity) return;

  const teams = playingTeams(activity.event.teams, activity);
  if (teams.length < 2) return;

  const schedule = roundRobinSchedule(teams.map((t) => t.id));

  const byRound = new Map<number, typeof schedule>();
  for (const game of schedule) {
    if (!byRound.has(game.round)) byRound.set(game.round, []);
    byRound.get(game.round)!.push(game);
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { activityId } });

    for (const [round, games] of byRound) {
      for (let i = 0; i < games.length; i++) {
        await tx.match.create({
          data: {
            activityId,
            round,
            position: i,
            teamAId: games[i].teamAId,
            teamBId: games[i].teamBId,
          },
        });
      }
    }
  });

  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
}

// --- Bracket generation (double elimination) ---
//
// Every match records where its winner (and, for winners-bracket matches,
// its loser) goes next — set once here at generation time. reportScore
// just follows those pointers, so it doesn't need to re-derive any
// bracket math.
//
// Shape:
//   Winners bracket (WB): standard bracket, byes only ever occur in
//     round 1 (to pad a non-power-of-two team count up to size).
//   Losers bracket (LB): alternates "consolidate" rounds (LB survivors
//     play each other) and "drop-in" rounds (LB survivors play the
//     newest batch of WB losers). Starts by pairing up WB round-1
//     losers; a WB round-1 bye produces no loser, so an LB round-1
//     match fed by two byes is a dead slot ("void") — we detect this at
//     generation time and pre-mark the next round as an automatic
//     advance for whichever real team eventually lands there.
//   Grand final: always created, even with only 2 teams (the single
//     match's loser goes straight there as the "LB champion" by
//     default). If the losers-bracket champion wins game 1, both
//     finalists now have exactly one loss, so reportScore creates a
//     second, winner-take-all match automatically.

export async function generateBracket(activityId: string, eventSlug: string) {
  const event = await getEditableEvent(eventSlug);
  if (!event) return;

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, eventId: event.id },
    include: {
      event: { include: { teams: true } },
      excludedTeams: { select: { id: true } },
    },
  });
  if (!activity) return;

  const teams = [...playingTeams(activity.event.teams, activity)].sort((a, b) => {
    const seedA = a.seed ?? Number.MAX_SAFE_INTEGER;
    const seedB = b.seed ?? Number.MAX_SAFE_INTEGER;
    if (seedA !== seedB) return seedA - seedB;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  if (teams.length < 2) return;

  const bracketSize = nextPowerOfTwo(teams.length);
  const numWbRounds = Math.log2(bracketSize);
  const order = seedOrder(bracketSize);

  const seedToTeam = new Map<number, (typeof teams)[number]>();
  teams.forEach((team, i) => seedToTeam.set(i + 1, team));

  await prisma.$transaction(
    async (tx) => {
      await tx.match.deleteMany({ where: { activityId } });

      // ---------------- Winners bracket ----------------
      type WbRow = { id: string; isBye: boolean; winnerId: string | null };
      const wbRounds: WbRow[][] = [];

      const round1: WbRow[] = [];
      for (let i = 0; i < bracketSize / 2; i++) {
        const seedA = order[i * 2];
        const seedB = order[i * 2 + 1];
        const teamA = seedToTeam.get(seedA) ?? null;
        const teamB = seedToTeam.get(seedB) ?? null;
        const isBye = !teamA || !teamB;
        const winnerId = isBye ? (teamA?.id ?? teamB?.id ?? null) : null;

        const match = await tx.match.create({
          data: {
            activityId,
            bracket: "WINNERS",
            round: 1,
            position: i,
            teamAId: teamA?.id ?? null,
            teamBId: teamB?.id ?? null,
            isBye,
            winnerId,
          },
        });
        round1.push({ id: match.id, isBye, winnerId });
      }
      wbRounds.push(round1);

      let prevWb = round1;
      for (let round = 2; round <= numWbRounds; round++) {
        const count = bracketSize / Math.pow(2, round);
        const thisRound: WbRow[] = [];
        for (let i = 0; i < count; i++) {
          const feederA = prevWb[i * 2];
          const feederB = prevWb[i * 2 + 1];
          const teamAId = feederA.isBye ? feederA.winnerId : null;
          const teamBId = feederB.isBye ? feederB.winnerId : null;

          const match = await tx.match.create({
            data: {
              activityId,
              bracket: "WINNERS",
              round,
              position: i,
              teamAId,
              teamBId,
            },
          });
          thisRound.push({ id: match.id, isBye: false, winnerId: null });
        }
        wbRounds.push(thisRound);
        prevWb = thisRound;
      }

      // ---------------- Losers bracket ----------------
      type LbRow = { id: string; isVoid: boolean };
      const lbRounds: { type: "consolidate" | "dropin"; rows: LbRow[] }[] =
        [];

      if (numWbRounds >= 2) {
        // LB round 1: pairs of WB round-1 losers. A bye produces no
        // loser, so a pairing of two byes is a dead ("void") slot.
        const r1Count = bracketSize / 4;
        const r1: LbRow[] = [];
        for (let i = 0; i < r1Count; i++) {
          const phantomA = round1[i * 2].isBye;
          const phantomB = round1[i * 2 + 1].isBye;
          const isVoid = phantomA && phantomB;
          const isBye = phantomA || phantomB; // one real side auto-advances once known

          const match = await tx.match.create({
            data: {
              activityId,
              bracket: "LOSERS",
              round: 1,
              position: i,
              isBye,
            },
          });
          r1.push({ id: match.id, isVoid });
        }
        lbRounds.push({ type: "consolidate", rows: r1 });

        let prevRows = r1;
        for (let wbRound = 2; wbRound <= numWbRounds; wbRound++) {
          // Drop-in round: merges previous LB survivors with this WB
          // round's losers, matched position-for-position.
          const rows: LbRow[] = [];
          for (let i = 0; i < prevRows.length; i++) {
            const priorVoid = prevRows[i].isVoid;
            const match = await tx.match.create({
              data: {
                activityId,
                bracket: "LOSERS",
                round: lbRounds.length + 1,
                position: i,
                isBye: priorVoid, // that survivor slot can never fill; auto-advance the WB dropout
              },
            });
            rows.push({ id: match.id, isVoid: false });
          }
          lbRounds.push({ type: "dropin", rows });
          prevRows = rows;

          if (wbRound < numWbRounds) {
            // Consolidate round: pairs this drop-in round's winners.
            const cRows: LbRow[] = [];
            for (let i = 0; i < rows.length / 2; i++) {
              const match = await tx.match.create({
                data: {
                  activityId,
                  bracket: "LOSERS",
                  round: lbRounds.length + 1,
                  position: i,
                },
              });
              cRows.push({ id: match.id, isVoid: false });
            }
            lbRounds.push({ type: "consolidate", rows: cRows });
            prevRows = cRows;
          }
        }
      }

      // ---------------- Grand final ----------------
      const grandFinal = await tx.match.create({
        data: { activityId, bracket: "GRAND_FINAL", round: 1, position: 0 },
      });

      // ---------------- Wire forward pointers ----------------

      const dropinRounds = lbRounds.filter((r) => r.type === "dropin");

      for (let round = 1; round <= numWbRounds; round++) {
        const rows = wbRounds[round - 1];
        const isFinal = round === numWbRounds;

        for (let i = 0; i < rows.length; i++) {
          const data: Prisma.MatchUpdateInput = {};

          if (isFinal) {
            data.winnerNextMatchId = grandFinal.id;
            data.winnerNextSlot = "A"; // WB champion sits in slot A by convention
          } else {
            data.winnerNextMatchId = wbRounds[round][Math.floor(i / 2)].id;
            data.winnerNextSlot = i % 2 === 0 ? "A" : "B";
          }

          if (numWbRounds === 1) {
            // Only one WB round (also the final) and no losers bracket
            // at all — the loser goes straight to the grand final as
            // the "LB champion" by default, with no games needed to
            // get there.
            data.loserNextMatchId = grandFinal.id;
            data.loserNextSlot = "B";
          } else if (round === 1) {
            const target = lbRounds[0].rows[Math.floor(i / 2)];
            data.loserNextMatchId = target.id;
            data.loserNextSlot = i % 2 === 0 ? "A" : "B";
          } else {
            const target = dropinRounds[round - 2].rows[i];
            data.loserNextMatchId = target.id;
            data.loserNextSlot = "B";
          }

          await tx.match.update({ where: { id: rows[i].id }, data });
        }
      }

      for (let r = 0; r < lbRounds.length; r++) {
        const { type, rows } = lbRounds[r];
        const isLast = r === lbRounds.length - 1;

        for (let i = 0; i < rows.length; i++) {
          const data: Prisma.MatchUpdateInput = {};

          if (isLast) {
            data.winnerNextMatchId = grandFinal.id;
            data.winnerNextSlot = "B"; // LB champion sits in slot B by convention
          } else if (type === "consolidate") {
            data.winnerNextMatchId = lbRounds[r + 1].rows[i].id;
            data.winnerNextSlot = "A";
          } else {
            data.winnerNextMatchId =
              lbRounds[r + 1].rows[Math.floor(i / 2)].id;
            data.winnerNextSlot = i % 2 === 0 ? "A" : "B";
          }

          await tx.match.update({ where: { id: rows[i].id }, data });
        }
      }
    },
    { timeout: 30000 }
  );

  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
}

// Fills one slot of a match. If that match was pre-marked as an
// automatic-advance (its other slot can never be filled) and now has a
// team in it, resolve its winner immediately and cascade the same fill
// into whatever match comes next.
async function fillSlot(
  tx: Prisma.TransactionClient,
  matchId: string,
  slot: "A" | "B" | string,
  teamId: string
) {
  const match = await tx.match.findUniqueOrThrow({
    where: { id: matchId },
    select: {
      isBye: true,
      winnerId: true,
      teamAId: true,
      teamBId: true,
      winnerNextMatchId: true,
      winnerNextSlot: true,
    },
  });

  const teamAId = slot === "A" ? teamId : match.teamAId;
  const teamBId = slot === "B" ? teamId : match.teamBId;

  let winnerId = match.winnerId;
  if (match.isBye && !winnerId) {
    winnerId = teamAId ?? teamBId ?? null;
  }

  const updated = await tx.match.update({
    where: { id: matchId },
    data: {
      ...(slot === "A" ? { teamAId: teamId } : { teamBId: teamId }),
      ...(winnerId ? { winnerId } : {}),
    },
  });

  if (winnerId && updated.winnerNextMatchId && updated.winnerNextSlot) {
    await fillSlot(
      tx,
      updated.winnerNextMatchId,
      updated.winnerNextSlot,
      winnerId
    );
  }

  return updated;
}

export type ScoreActionState = { error?: string };

// Thrown inside a score transaction to abort it (rolling back anything
// already written) and show `message` to the organizer.
class ScoreRejected extends Error {}

// Locks the given match rows until the transaction ends, so two people
// (or one person double-tapping Save) can't act on the same matches at
// the same time. A second request waits here, then sees the first
// one's result when it re-reads the rows.
async function lockMatches(tx: Prisma.TransactionClient, ids: string[]) {
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT id FROM "Match" WHERE id IN (${Prisma.join(
    ids
  )}) ORDER BY id FOR UPDATE`;
}

function readMatchScores(
  formData: FormData
): { scoreA: number; scoreB: number } | { error: string } {
  // Number("") is 0, so a blank box used to count as a zero; and the
  // columns are Ints, so a decimal crashed the request. Require a whole
  // number for both.
  const scoreA = parseIntInRange(
    formData.get("scoreA"),
    0,
    LIMITS.matchScoreMax
  );
  const scoreB = parseIntInRange(
    formData.get("scoreB"),
    0,
    LIMITS.matchScoreMax
  );

  if (scoreA === null || scoreB === null) {
    return {
      error: `Enter a whole-number score (0–${LIMITS.matchScoreMax}) for both teams.`,
    };
  }
  if (scoreA === scoreB) {
    return {
      error: "Scores can't be tied — elimination matches need a winner.",
    };
  }
  return { scoreA, scoreB };
}

// Runs a score transaction, turning ScoreRejected into a friendly error.
async function runScoreTransaction(
  work: (tx: Prisma.TransactionClient) => Promise<void>
): Promise<ScoreActionState> {
  try {
    await prisma.$transaction(work);
    return {};
  } catch (err) {
    if (err instanceof ScoreRejected) return { error: err.message };
    throw err;
  }
}

// Grand final, game 1: if the losers-bracket champion (slot B by
// convention) wins, both finalists now have one loss, so force a
// winner-take-all rematch.
async function createResetIfNeeded(
  tx: Prisma.TransactionClient,
  match: { bracket: string; round: number; activityId: string },
  teamAId: string,
  teamBId: string,
  winnerId: string
) {
  if (match.bracket !== "GRAND_FINAL" || match.round !== 1) return;
  if (winnerId === teamAId) return; // WB champion won, so the event is over

  await tx.match.create({
    data: {
      activityId: match.activityId,
      bracket: "GRAND_FINAL",
      round: 2,
      position: 0,
      teamAId,
      teamBId,
    },
  });
}

export async function reportScore(
  matchId: string,
  eventSlug: string,
  activityId: string,
  _prevState: ScoreActionState,
  formData: FormData
): Promise<ScoreActionState> {
  const event = await getEditableEvent(eventSlug);
  if (!event) {
    return { error: "Only the event organizer can enter scores." };
  }

  const scores = readMatchScores(formData);
  if ("error" in scores) return scores;
  const { scoreA, scoreB } = scores;

  // Cheap ownership check up front, before taking any locks.
  const owned = await prisma.match.findFirst({
    where: { id: matchId, activity: { id: activityId, eventId: event.id } },
    select: { id: true },
  });
  if (!owned) return { error: "That match doesn't belong to this event." };

  const result = await runScoreTransaction(async (tx) => {
    // Re-read the match *after* locking it. Reading it before the
    // transaction (as this used to) meant a double submit, or two
    // organizers scoring at once, could both see "no winner yet",
    // overwrite each other, and even create two grand-final rematches.
    await lockMatches(tx, [matchId]);
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) {
      // The bracket was regenerated while this form was open.
      throw new ScoreRejected("This match no longer exists. Refresh the page.");
    }

    if (match.winnerId) {
      throw new ScoreRejected(
        "This match already has a result. Refresh to see it, or use Edit score."
      );
    }
    if (!match.teamAId || !match.teamBId) {
      throw new ScoreRejected("This match isn't ready for scores yet.");
    }

    const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
    const loserId = scoreA > scoreB ? match.teamBId : match.teamAId;

    await tx.match.update({
      where: { id: matchId },
      data: { scoreA, scoreB, winnerId },
    });

    if (match.winnerNextMatchId && match.winnerNextSlot) {
      await fillSlot(
        tx,
        match.winnerNextMatchId,
        match.winnerNextSlot,
        winnerId
      );
    }
    if (match.loserNextMatchId && match.loserNextSlot) {
      await fillSlot(tx, match.loserNextMatchId, match.loserNextSlot, loserId);
    }

    await createResetIfNeeded(
      tx,
      match,
      match.teamAId,
      match.teamBId,
      winnerId
    );
  });
  if (result.error) return result;

  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  return {};
}

// Corrects an already-decided match's score. Only allowed while nothing
// downstream has happened yet — if the winner has already played their
// next match (or, symmetrically, the loser has already played theirs in
// the losers bracket, or a grand-final reset match already exists),
// changing this result would need to unwind everything that followed
// from it. Rather than attempt that, we block it with a clear message
// and point back at "regenerate" for anything that far back.
export async function editScore(
  matchId: string,
  eventSlug: string,
  activityId: string,
  _prevState: ScoreActionState,
  formData: FormData
): Promise<ScoreActionState> {
  const event = await getEditableEvent(eventSlug);
  if (!event) {
    return { error: "Only the event organizer can edit scores." };
  }

  const scores = readMatchScores(formData);
  if ("error" in scores) return scores;
  const { scoreA, scoreB } = scores;

  const owned = await prisma.match.findFirst({
    where: { id: matchId, activity: { id: activityId, eventId: event.id } },
    select: { winnerNextMatchId: true, loserNextMatchId: true },
  });
  if (!owned) return { error: "That match doesn't belong to this event." };

  const CANT_EDIT =
    "Can't change this result — it's already affected later matches. Regenerate the bracket if you need to redo further back.";

  const result = await runScoreTransaction(async (tx) => {
    // Lock this match and the two it feeds, *then* check that neither
    // has been played. These checks used to run before the transaction,
    // so a downstream match could be scored in between the check and
    // the edit, leaving the bracket inconsistent.
    await lockMatches(
      tx,
      [matchId, owned.winnerNextMatchId, owned.loserNextMatchId].filter(
        (id): id is string => !!id
      )
    );
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) {
      // The bracket was regenerated while this form was open.
      throw new ScoreRejected("This match no longer exists. Refresh the page.");
    }

    if (!match.teamAId || !match.teamBId || !match.winnerId) {
      throw new ScoreRejected("This match hasn't been played yet.");
    }

    for (const nextId of [match.winnerNextMatchId, match.loserNextMatchId]) {
      if (!nextId) continue;
      const next = await tx.match.findUnique({
        where: { id: nextId },
        select: { winnerId: true },
      });
      if (next?.winnerId) throw new ScoreRejected(CANT_EDIT);
    }
    if (match.bracket === "GRAND_FINAL" && match.round === 1) {
      const resetExists = await tx.match.findFirst({
        where: { activityId, bracket: "GRAND_FINAL", round: 2 },
        select: { id: true },
      });
      if (resetExists) throw new ScoreRejected(CANT_EDIT);
    }

    const newWinnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
    const newLoserId = scoreA > scoreB ? match.teamBId : match.teamAId;

    await tx.match.update({
      where: { id: matchId },
      data: { scoreA, scoreB, winnerId: newWinnerId },
    });

    if (match.winnerNextMatchId && match.winnerNextSlot) {
      await fillSlot(
        tx,
        match.winnerNextMatchId,
        match.winnerNextSlot,
        newWinnerId
      );
    }
    if (match.loserNextMatchId && match.loserNextSlot) {
      await fillSlot(
        tx,
        match.loserNextMatchId,
        match.loserNextSlot,
        newLoserId
      );
    }

    await createResetIfNeeded(
      tx,
      match,
      match.teamAId,
      match.teamBId,
      newWinnerId
    );
  });
  if (result.error) return result;

  await notifyEventChanged(eventSlug);
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  return {};
}
