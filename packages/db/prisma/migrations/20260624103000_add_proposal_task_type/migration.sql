ALTER TYPE "ResearchTaskType" ADD VALUE IF NOT EXISTS 'PROPOSAL';

ALTER TABLE "Proposal" ADD COLUMN "taskId" TEXT;

CREATE UNIQUE INDEX "Proposal_taskId_key" ON "Proposal"("taskId");

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_taskId_fkey"
  FOREIGN KEY ("taskId")
  REFERENCES "ResearchTask"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
