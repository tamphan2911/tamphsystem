ALTER TABLE "ResearchTaskAssignment"
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completedById" TEXT,
ADD COLUMN "completionMessage" TEXT,
ADD COLUMN "redoRequestedAt" TIMESTAMP(3),
ADD COLUMN "redoRequestedById" TEXT,
ADD COLUMN "redoReason" TEXT;

UPDATE "ResearchTaskAssignment" AS assignment
SET "dueDate" = task."dueDate"
FROM "ResearchTask" AS task
WHERE assignment."taskId" = task."id";

CREATE INDEX "ResearchTaskAssignment_completedById_idx" ON "ResearchTaskAssignment"("completedById");
CREATE INDEX "ResearchTaskAssignment_redoRequestedById_idx" ON "ResearchTaskAssignment"("redoRequestedById");
