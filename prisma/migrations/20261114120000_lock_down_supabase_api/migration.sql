-- Lock the app's tables away from Supabase's public API.
--
-- Supabase exposes every table in the `public` schema through its REST
-- (PostgREST) and Realtime APIs to anyone holding the anon key. That key
-- ships to every browser in NEXT_PUBLIC_SUPABASE_ANON_KEY, so without
-- Row Level Security anyone could read every event's secret editToken,
-- or insert, update and delete rows directly, bypassing the app.
--
-- The app never needs that access: all reads and writes go through
-- Prisma on the server, which connects as the table owner (`postgres`)
-- and is therefore not subject to RLS. So we enable RLS with *no*
-- policies, which means the anon and authenticated API roles can see and
-- change nothing, while Prisma keeps working exactly as before.

ALTER TABLE "Event"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlacementPoint"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Score"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Live updates now use data-free broadcast pings (see
-- src/lib/realtime-server.ts), so stop publishing raw row changes over
-- Realtime. Guarded so this is a no-op on plain Postgres (local dev,
-- shadow databases) where the publication or tables aren't in it.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename IN (
        'Event', 'Team', 'Activity', 'Match',
        'PlacementPoint', 'Category', 'Score'
      )
  LOOP
    EXECUTE format(
      'ALTER PUBLICATION supabase_realtime DROP TABLE %I.%I',
      t.schemaname, t.tablename
    );
  END LOOP;
END $$;
