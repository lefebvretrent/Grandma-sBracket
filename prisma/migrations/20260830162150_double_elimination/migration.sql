-- CreateEnum
CREATE TYPE "MatchBracket" AS ENUM ('WINNERS', 'LOSERS', 'GRAND_FINAL');

-- DropIndex
DROP INDEX "Match_activityId_round_idx";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bracket" "MatchBracket" NOT NULL DEFAULT 'WINNERS',
ADD COLUMN     "loserNextMatchId" TEXT,
ADD COLUMN     "loserNextSlot" TEXT,
ADD COLUMN     "winnerNextMatchId" TEXT,
ADD COLUMN     "winnerNextSlot" TEXT;

-- CreateIndex
CREATE INDEX "Match_activityId_bracket_round_idx" ON "Match"("activityId", "bracket", "round");
