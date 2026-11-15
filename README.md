# Grandma's Bracket

"Brackets made so easy, even your grandma could do it." A bracket and
scoring app for family field day events: double-elimination brackets
(with automatic byes), round robins and weighted-score judging (e.g.
karaoke), with an overall leaderboard and a big-screen presenter view.
All under one flexible Event → Activity → (Match | Score) data model.

## Stack

- **Next.js** (App Router, TypeScript) — frontend + backend in one app
- **Tailwind CSS** + hand-added shadcn-style components — clean, accessible UI
- **Prisma** — schema + queries, see `prisma/schema.prisma`
- **Supabase** — Postgres database, auth, and realtime updates
- **Vercel** — hosting, auto-deploys on push to GitHub

## One-time setup

### 1. Get this code into your GitHub Desktop repo folder

If you haven't already: in GitHub Desktop, create a new repository. Then
copy every file from this folder into that repo's local folder (the one
GitHub Desktop shows you in Finder/Explorer) — this whole folder *is* the
repo contents.

### 2. Open it in Cursor

File → Open Folder → select the repo folder. Open a terminal in Cursor
(Ctrl/Cmd + `) for the commands below.

### 3. Install dependencies

```bash
npm install
```

### 4. Create a Supabase project

Go to supabase.com → New project (free tier is plenty for this). Once
it's created:

- **Settings → Database → Connection string**: copy the "Transaction
  pooler" URL (port 6543) and the "Session pooler" or direct URL (port
  5432).
- **Settings → API**: copy the Project URL and the `anon` public key.

Copy `.env.example` to `.env` and `.env.local`, and fill in those four
values (Prisma reads `.env`, Next.js reads `.env.local` — for local dev
it's easiest to just put the same values in both).

### 5. Run the first migration

This creates all the tables (Event, Team, Activity, Match, Category,
Score) in your Supabase database:

```bash
npm run db:migrate
```

It'll ask for a migration name — `init` is fine.

### 6. Run it locally

```bash
npm run dev
```

Open http://localhost:3000 to see the home page.

### 7. Push and deploy

Commit + push from GitHub Desktop as normal. Then go to vercel.com → New
Project → import your GitHub repo. When it asks for environment
variables, add the same four values from your `.env` file. Every push to
`main` after this will auto-deploy.

## Project structure

```
prisma/schema.prisma       the data model — start here to understand the app
src/lib/prisma.ts          server-side database client
src/lib/supabase.ts        client-side Supabase client (auth, realtime)
src/components/ui/         shared UI components (button, card, input)
src/app/                   pages and routes
```

## Data model, in short

- **Event** — one games day, has many Teams and Activities
- **Activity** — one game (Badminton, Karaoke...), with a `format`:
  `ELIMINATION`, `ROUND_ROBIN`, or `WEIGHTED_SCORE`
- **Match** — used by elimination/round-robin activities; round + position
  + two teams + scores + winner
- Every team plays every game unless it's unticked under "Teams in this
  game" (stored as `Activity.excludedTeams`). A team can't be removed
  from the event while it's in a generated bracket or schedule.
- **Category** / **Score** — used by weighted-score activities; each
  category has a weight, each team gets a raw score per category

Adding a new game type later just means adding a new format value and a
small UI — Event and Team don't need to change.

## Tests

```bash
npm test            # run everything once
npm run test:watch  # re-run on save
npm run typecheck   # TypeScript check
```

- `src/lib/__tests__/*.test.ts` cover the pure logic: seeding, round
  robin schedules, judged scoring, standings and input validation. They
  need no database.
- `bracket-flow.db.test.ts` plays whole double-elimination brackets
  (2 to 17 teams) from start to finish against a real database. It only
  runs when `TEST_DATABASE_URL` is set and uses that database, never the
  `DATABASE_URL` in `.env`. **Point it at a throwaway local Postgres,
  never at production.** Without it those tests are skipped.
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, the type check
  and all tests, including the database ones, on every pull request.

## Applying database changes in production

Vercel's build only runs `prisma generate`; it does **not** apply
migrations. Whenever a commit adds a folder under `prisma/migrations/`,
apply it to the production database from your machine (with `.env`
pointing at production):

```bash
npx prisma migrate deploy
```

## Security model

- **No accounts.** Creating an event sets an httpOnly cookie holding that
  event's secret `editToken` (256 random bits). Everyone else with the
  code or link can only view.
- **Organizer link.** The event page shows organizers a secret link
  (`/events/<code>/organizer#<secret>`) that gives any browser that opens
  it the same edit access: for a second device, a co-host, or getting
  back in after clearing cookies. The secret sits after the `#`, which
  browsers never send to the server, so it stays out of logs. "Reset
  link" issues a new secret and cuts off every other device.
- **Every server action is scoped to the organizer's own event**
  (`getEditableEvent` in `src/lib/permissions.ts`). Ids passed from the
  browser are never trusted on their own.
- **The Supabase anon key is public**, so all tables have Row Level
  Security enabled with no policies: the public REST/Realtime API can't
  read or write anything. The app talks to the database only through
  Prisma on the server, which isn't affected by RLS.
- **Live updates** are data-free broadcast pings on an `event:<code>`
  channel (`src/lib/realtime-server.ts` →
  `src/components/realtime-refresh.tsx`); pages then re-fetch through
  the server. Supabase Realtime must allow public broadcast channels
  (the default; see Project Settings → Realtime).
- **Input limits** live in `src/lib/validation.ts`.

## Branding, link previews and icons

- Site name, tagline and description live in `src/lib/site.ts`.
- The browser-tab icon, home-screen icon and the image shown when a
  link is shared are drawn in code from one logo
  (`src/app/brand-mark.tsx` → `icon.tsx`, `apple-icon.tsx`,
  `opengraph-image.tsx`).
- Link previews need the site's public address. On Vercel this is
  picked up automatically; if you add a custom domain, set
  `NEXT_PUBLIC_SITE_URL` (e.g. `https://grandmasbracket.com`) in Vercel's
  environment variables.

## Keeping the free Supabase project awake

Supabase pauses free-tier projects after about a week with no database
activity, which takes the site down until you restore the project in the
Supabase dashboard. `vercel.json` schedules a daily call to
`/api/keep-alive`, which runs a trivial query so the project always
counts as active. Nothing to set up: Vercel reads `vercel.json` on the
next deploy (see Project → Settings → Cron Jobs to confirm it's listed).
Optionally add a `CRON_SECRET` environment variable in Vercel to stop
anyone else calling the endpoint. It can't wake a project that is
already paused, so restore it once by hand first if needed.
