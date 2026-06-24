DROP INDEX IF EXISTS "Proposal_taskId_key";

CREATE INDEX IF NOT EXISTS "Proposal_taskId_createdAt_idx" ON "Proposal"("taskId", "createdAt");
