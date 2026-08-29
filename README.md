# Family Games Bracket

Bracket + scoring app for family field day events. Supports single-elimination
brackets (with automatic byes) and weighted-score judging (e.g. karaoke),
all under one flexible Event → Activity → (Match | Score) data model.

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

Open http://localhost:3000 — you should see the placeholder home page
confirming everything's connected.

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
- **Category** / **Score** — used by weighted-score activities; each
  category has a weight, each team gets a raw score per category

Adding a new game type later just means adding a new format value and a
small UI — Event and Team don't need to change.

## What's next

This scaffold covers project setup and the data model. Next up: the event
and team setup screens, then the bracket generation engine.
