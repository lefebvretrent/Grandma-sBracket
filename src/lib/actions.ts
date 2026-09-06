"use server";

import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/join-code";
import { nextPowerOfTwo, seedOrder } from "@/lib/bracket";
import { canEdit, grantEditAccess } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Event name is required");

  let slug = generateJoinCode();
  // Practically never collides at 6 chars, but cheap to guard anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing) break;
    slug = generateJoinCode();
  }

  const event = await prisma.event.create({ data: { name, slug } });
  await grantEditAccess(slug, event.editToken);

  redirect(`/events/${slug}`);
}

export type JoinEventState = { error?: string };

export async function joinEvent(
  _prevState: JoinEventState,
  formData: FormData
): Promise<JoinEventState> {
  const raw = String(formData.get("code") || "").trim();
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

export async function addTeam(
  eventId: string,
  eventSlug: string,
  formData: FormData
) {
  if (!(await canEdit(eventSlug))) return;

  const name = String(formData.get("name") || "").trim();
  const members = String(formData.get("members") || "").trim() || null;
  if (!name) return;

  await prisma.team.create({ data: { name, members, eventId } });
  revalidatePath(`/events/${eventSlug}`);
}

export async function deleteTeam(teamId: string, eventSlug: string) {
  if (!(await canEdit(eventSlug))) return;

  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath(`/events/${eventSlug}`);
}

// Shuffles all teams in the event and assigns seeds 1..N based on the
// shuffled order. Simple Fisher-Yates so every ordering is equally likely.
export async function randomizeSeeds(eventId: string, eventSlug: string) {
  if (!(await canEdit(eventSlug))) return;

  const teams = await prisma.team.findMany({ where: { eventId } });

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
  revalidatePath(`/events/${eventSlug}`);
}

export async function clearSeeds(eventId: string, eventSlug: string) {
  if (!(await canEdit(eventSlug))) return;

  await prisma.team.updateMany({ where: { eventId }, data: { seed: null } });
  revalidatePath(`/events/${eventSlug}`);
}

export async function setSeed(
  teamId: string,
  eventSlug: string,
  formData: FormData
) {
  if (!(await canEdit(eventSlug))) return;

  const raw = String(formData.get("seed") || "").trim();
  const parsed = raw === "" ? null : Number(raw);
  const seed = parsed !== null && !Number.isNaN(parsed) ? parsed : null;

  await prisma.team.update({ where: { id: teamId }, data: { seed } });
  revalidatePath(`/events/${eventSlug}`);
}

// --- Activities ---

export async function createActivity(
  eventId: string,
  eventSlug: string,
  formData: FormData
) {
  if (!(await canEdit(eventSlug))) return;

  const name = String(formData.get("name") || "").trim();
  const format = String(formData.get("format") || "ELIMINATION") as
    | "ELIMINATION"
    | "ROUND_ROBIN"
    | "WEIGHTED_SCORE";
  if (!name) return;

  await prisma.activity.create({
    data: {
      name,
      format,
      eventId,
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
  revalidatePath(`/events/${eventSlug}`);
}

export async function setPlacementPoints(
  activityId: string,
  eventSlug: string,
  formData: FormData
) {
  if (!(await canEdit(eventSlug))) return;

  const entries = [1, 2, 3].map((placement) => {
    const raw = String(formData.get(`points-${placement}`) ?? "0");
    const points = Number(raw);
    return { placement, points: Number.isNaN(points) ? 0 : points };
  });

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.placementPoint.upsert({
        where: {
          activityId_placement: { activityId, placement: entry.placement },
        },
        create: { activityId, placement: entry.placement, points: entry.points },
        update: { points: entry.points },
      })
    )
  );

  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

// --- Standings ---

export async function toggleStandingsVisibility(
  eventId: string,
  eventSlug: string
) {
  if (!(await canEdit(eventSlug))) return;

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
  });
  await prisma.event.update({
    where: { id: eventId },
    data: { standingsVisible: !event.standingsVisible },
  });
  revalidatePath(`/events/${eventSlug}`);
  revalidatePath(`/events/${eventSlug}/standings`);
}

// --- Weighted (judged) scoring ---

export async function addCategory(
  activityId: string,
  eventSlug: string,
  formData: FormData
) {
  if (!(await canEdit(eventSlug))) return;

  const name = String(formData.get("name") || "").trim();
  const weightRaw = String(formData.get("weight") || "1");
  const weight = Number(weightRaw);
  if (!name) return;

  await prisma.category.create({
    data: { name, weight: Number.isNaN(weight) ? 1 : weight, activityId },
  });
  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
}

export async function deleteCategory(
  categoryId: string,
  eventSlug: string,
  activityId: string
) {
  if (!(await canEdit(eventSlug))) return;

  await prisma.category.delete({ where: { id: categoryId } });
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
  if (!(await canEdit(eventSlug))) return;

  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: {
      event: { include: { teams: true } },
      categories: true,
    },
  });

  const upserts = [];
  for (const team of activity.event.teams) {
    for (const category of activity.categories) {
      const raw = formData.get(`score-${team.id}-${category.id}`);
      if (raw === null || raw === "") continue;
      const value = Number(raw);
      if (Number.isNaN(value)) continue;

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

  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  revalidatePath(`/events/${eventSlug}/standings`);
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
//   Grand final: WB champion vs LB champion. If the LB champion wins
//     game 1, both finalists now have exactly one loss, so reportScore
//     creates a second, winner-take-all match automatically.

export async function generateBracket(activityId: string, eventSlug: string) {
  if (!(await canEdit(eventSlug))) return;

  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: { event: { include: { teams: true } } },
  });

  const teams = [...activity.event.teams].sort((a, b) => {
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
            data: { activityId, bracket: "WINNERS", round, position: i, teamAId, teamBId },
          });
          thisRound.push({ id: match.id, isBye: false, winnerId: null });
        }
        wbRounds.push(thisRound);
        prevWb = thisRound;
      }

      // ---------------- Losers bracket ----------------
      type LbRow = { id: string; isVoid: boolean };
      const lbRounds: { type: "consolidate" | "dropin"; rows: LbRow[] }[] = [];

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
            data: { activityId, bracket: "LOSERS", round: 1, position: i, isBye },
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
                data: { activityId, bracket: "LOSERS", round: lbRounds.length + 1, position: i },
              });
              cRows.push({ id: match.id, isVoid: false });
            }
            lbRounds.push({ type: "consolidate", rows: cRows });
            prevRows = cRows;
          }
        }
      }

      // ---------------- Grand final ----------------
      const grandFinal =
        numWbRounds >= 2
          ? await tx.match.create({
              data: { activityId, bracket: "GRAND_FINAL", round: 1, position: 0 },
            })
          : null;

      // ---------------- Wire forward pointers ----------------

      const dropinRounds = lbRounds.filter((r) => r.type === "dropin");

      for (let round = 1; round <= numWbRounds; round++) {
        const rows = wbRounds[round - 1];
        const isFinal = round === numWbRounds;

        for (let i = 0; i < rows.length; i++) {
          const data: Prisma.MatchUpdateInput = {};

          if (isFinal) {
            if (grandFinal) {
              data.winnerNextMatchId = grandFinal.id;
              data.winnerNextSlot = "A"; // WB champion sits in slot A by convention
            }
          } else {
            data.winnerNextMatchId = wbRounds[round][Math.floor(i / 2)].id;
            data.winnerNextSlot = i % 2 === 0 ? "A" : "B";
          }

          if (numWbRounds >= 2) {
            if (round === 1) {
              const target = lbRounds[0].rows[Math.floor(i / 2)];
              data.loserNextMatchId = target.id;
              data.loserNextSlot = i % 2 === 0 ? "A" : "B";
            } else {
              const target = dropinRounds[round - 2].rows[i];
              data.loserNextMatchId = target.id;
              data.loserNextSlot = "B";
            }
          }

          await tx.match.update({ where: { id: rows[i].id }, data });
        }
      }

      for (let r = 0; r < lbRounds.length; r++) {
        const { type, rows } = lbRounds[r];
        const isLast = r === lbRounds.length - 1;

        for (let i = 0; i < rows.length; i++) {
          const data: Prisma.MatchUpdateInput = {};

          if (isLast && grandFinal) {
            data.winnerNextMatchId = grandFinal.id;
            data.winnerNextSlot = "B"; // LB champion sits in slot B by convention
          } else if (type === "consolidate") {
            data.winnerNextMatchId = lbRounds[r + 1].rows[i].id;
            data.winnerNextSlot = "A";
          } else {
            data.winnerNextMatchId = lbRounds[r + 1].rows[Math.floor(i / 2)].id;
            data.winnerNextSlot = i % 2 === 0 ? "A" : "B";
          }

          await tx.match.update({ where: { id: rows[i].id }, data });
        }
      }
    },
    { timeout: 30000 }
  );

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
  // Fetch current match state to check if it's a bye
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

  // Determine updated team slots
  const teamAId = slot === "A" ? teamId : match.teamAId;
  const teamBId = slot === "B" ? teamId : match.teamBId;

  // Auto-advance winner if this is an unassigned bye match
  let winnerId = match.winnerId;
  if (match.isBye && !winnerId) {
    winnerId = teamAId ?? teamBId ?? null;
  }

  // Single batch update for both slot filling and optional auto-winner assignment
  const updated = await tx.match.update({
    where: { id: matchId },
    data: {
      ...(slot === "A" ? { teamAId: teamId } : { teamBId: teamId }),
      ...(winnerId ? { winnerId } : {}),
    },
  });

  // Recurse into the next bracket match if a winner was assigned
  if (winnerId && updated.winnerNextMatchId && updated.winnerNextSlot) {
    await fillSlot(tx, updated.winnerNextMatchId, updated.winnerNextSlot, winnerId);
  }

  return updated;
}

export type ScoreActionState = { error?: string };

export async function reportScore(
  matchId: string,
  eventSlug: string,
  activityId: string,
  _prevState: ScoreActionState,
  formData: FormData
): Promise<ScoreActionState> {
  if (!(await canEdit(eventSlug))) {
    return { error: "Only the event organizer can enter scores." };
  }

  const scoreA = Number(formData.get("scoreA"));
  const scoreB = Number(formData.get("scoreB"));

  if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) {
    return { error: "Enter a score for both teams." };
  }
  if (scoreA === scoreB) {
    return { error: "Scores can't be tied — elimination matches need a winner." };
  }

  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  if (!match.teamAId || !match.teamBId) {
    return { error: "This match isn't ready for scores yet." };
  }

  const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
  const loserId = scoreA > scoreB ? match.teamBId : match.teamAId;

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: matchId },
      data: { scoreA, scoreB, winnerId },
    });

    if (match.winnerNextMatchId && match.winnerNextSlot) {
      await fillSlot(tx, match.winnerNextMatchId, match.winnerNextSlot, winnerId);
    }
    if (match.loserNextMatchId && match.loserNextSlot) {
      await fillSlot(tx, match.loserNextMatchId, match.loserNextSlot, loserId);
    }

    // Grand final, game 1: if the losers-bracket champion (slot B by
    // convention) wins, both finalists now have one loss — force a
    // winner-take-all rematch.
    if (match.bracket === "GRAND_FINAL" && match.round === 1) {
      const wbChampionWon = winnerId === match.teamAId;
      if (!wbChampionWon) {
        await tx.match.create({
          data: {
            activityId,
            bracket: "GRAND_FINAL",
            round: 2,
            position: 0,
            teamAId: match.teamAId,
            teamBId: match.teamBId,
          },
        });
      }
    }
  });

  revalidatePath(`/events/${eventSlug}/activities/${activityId}`);
  return {};
}
