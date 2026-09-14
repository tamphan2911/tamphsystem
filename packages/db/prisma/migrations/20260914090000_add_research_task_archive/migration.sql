ALTER TABLE "ResearchTask" ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "ResearchTask"
SET "archivedAt" = NOW()
WHERE "status" = 'COMPLETED'
  AND "completedAt" IS NOT NULL
  AND "completedAt" <= NOW() - INTERVAL '7 days'
  AND "archivedAt" IS NULL;

CREATE INDEX "ResearchTask_archivedAt_idx" ON "ResearchTask"("archivedAt");
