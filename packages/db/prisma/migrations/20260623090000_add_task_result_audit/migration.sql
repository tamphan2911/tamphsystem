ALTER TABLE "ResearchTask" ADD COLUMN "completedById" TEXT;
ALTER TABLE "ResearchTask" ADD COLUMN "completionMessage" TEXT;
ALTER TABLE "ResearchTask" ADD COLUMN "revokedById" TEXT;
ALTER TABLE "ResearchTask" ADD COLUMN "revokeReason" TEXT;

CREATE INDEX "ResearchTask_completedById_idx" ON "ResearchTask"("completedById");
CREATE INDEX "ResearchTask_revokedById_idx" ON "ResearchTask"("revokedById");

ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
