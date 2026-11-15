import { prisma } from "@/lib/prisma";

// Supabase pauses free-tier projects after about a week with no
// database activity, which takes the whole site down until someone
// restores it by hand. Vercel calls this once a day (see vercel.json)
// and it runs the cheapest possible query, which counts as activity.
//
// It reads and returns nothing useful, so it's safe to leave open. If
// you set a CRON_SECRET environment variable in Vercel, Vercel sends it
// with each scheduled call and anyone else is turned away.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await prisma.$queryRaw`SELECT 1`;
  return Response.json({ ok: true, at: new Date().toISOString() });
}
