"use server";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Event name is required");

  const slug = slugify(name);
  await prisma.event.create({ data: { name, slug } });

  redirect(`/events/${slug}`);
}

export async function addTeam(
  eventId: string,
  eventSlug: string,
  formData: FormData
) {
  const name = String(formData.get("name") || "").trim();
  const members = String(formData.get("members") || "").trim() || null;
  if (!name) return;

  await prisma.team.create({ data: { name, members, eventId } });
  revalidatePath(`/events/${eventSlug}`);
}

export async function deleteTeam(teamId: string, eventSlug: string) {
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath(`/events/${eventSlug}`);
}

// Shuffles all teams in the event and assigns seeds 1..N based on the
// shuffled order. Simple Fisher-Yates so every ordering is equally likely.
export async function randomizeSeeds(eventId: string, eventSlug: string) {
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
  await prisma.team.updateMany({ where: { eventId }, data: { seed: null } });
  revalidatePath(`/events/${eventSlug}`);
}

export async function setSeed(
  teamId: string,
  eventSlug: string,
  formData: FormData
) {
  const raw = String(formData.get("seed") || "").trim();
  const parsed = raw === "" ? null : Number(raw);
  const seed = parsed !== null && !Number.isNaN(parsed) ? parsed : null;

  await prisma.team.update({ where: { id: teamId }, data: { seed } });
  revalidatePath(`/events/${eventSlug}`);
}
