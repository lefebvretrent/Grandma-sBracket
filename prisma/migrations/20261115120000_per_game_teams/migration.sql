-- Lets the organizer leave teams out of a single game.
--
-- Each row says "this team is NOT playing in this activity". Storing
-- the exceptions (rather than the participants) means every existing
-- game, and every team added later, is included by default with no
-- data to backfill.
--
-- "A" is the Activity id and "B" is the Team id: Prisma's fixed naming
-- for an implicit many-to-many table (models in alphabetical order).

-- CreateTable
CREATE TABLE "_ActivityExcludedTeams" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActivityExcludedTeams_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ActivityExcludedTeams_B_index" ON "_ActivityExcludedTeams"("B");

-- AddForeignKey
ALTER TABLE "_ActivityExcludedTeams" ADD CONSTRAINT "_ActivityExcludedTeams_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityExcludedTeams" ADD CONSTRAINT "_ActivityExcludedTeams_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same lock-down as every other table (see
-- 20261114120000_lock_down_supabase_api): RLS on with no policies, so
-- Supabase's public API can't read or write it. Prisma is unaffected.
ALTER TABLE "_ActivityExcludedTeams" ENABLE ROW LEVEL SECURITY;
