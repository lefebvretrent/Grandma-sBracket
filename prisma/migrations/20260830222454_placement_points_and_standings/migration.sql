-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "standingsVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PlacementPoint" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PlacementPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementPoint_activityId_placement_key" ON "PlacementPoint"("activityId", "placement");

-- AddForeignKey
ALTER TABLE "PlacementPoint" ADD CONSTRAINT "PlacementPoint_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
