ALTER TYPE "ResearchTaskType" ADD VALUE 'ADD_JOURNAL';

ALTER TABLE "ResearchTask" ADD COLUMN "journalTargetCount" INTEGER;
ALTER TABLE "Journal" ADD COLUMN "resultTaskId" TEXT;
ALTER TABLE "Journal" ADD COLUMN "resultPosition" INTEGER;

CREATE INDEX "Journal_resultTaskId_idx" ON "Journal"("resultTaskId");
CREATE UNIQUE INDEX "Journal_resultTaskId_resultPosition_key"
ON "Journal"("resultTaskId", "resultPosition");

ALTER TABLE "Journal"
ADD CONSTRAINT "Journal_resultTaskId_fkey"
FOREIGN KEY ("resultTaskId") REFERENCES "ResearchTask"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
