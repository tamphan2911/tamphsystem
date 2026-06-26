-- CreateEnum
CREATE TYPE "ResearchCalendarItemType" AS ENUM ('EVENT', 'TODO');

-- CreateEnum
CREATE TYPE "ResearchCalendarItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "ResearchCalendarItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "itemType" "ResearchCalendarItemType" NOT NULL DEFAULT 'EVENT',
    "status" "ResearchCalendarItemStatus" NOT NULL DEFAULT 'PLANNED',
    "color" TEXT NOT NULL DEFAULT 'cyan',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ResearchCalendarItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchCalendarItem_startAt_endAt_idx" ON "ResearchCalendarItem"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "ResearchCalendarItem_createdById_startAt_idx" ON "ResearchCalendarItem"("createdById", "startAt");

-- AddForeignKey
ALTER TABLE "ResearchCalendarItem" ADD CONSTRAINT "ResearchCalendarItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
