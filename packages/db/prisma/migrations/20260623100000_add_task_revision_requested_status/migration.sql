ALTER TYPE "ResearchTaskStatus" ADD VALUE IF NOT EXISTS 'REVISION_REQUESTED';

ALTER TABLE "ResearchTask" ADD COLUMN "redoRequestedAt" TIMESTAMP(3);
ALTER TABLE "ResearchTask" ADD COLUMN "redoRequestedById" TEXT;
ALTER TABLE "ResearchTask" ADD COLUMN "redoReason" TEXT;

CREATE INDEX "ResearchTask_redoRequestedById_idx" ON "ResearchTask"("redoRequestedById");

ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_redoRequestedById_fkey" FOREIGN KEY ("redoRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
