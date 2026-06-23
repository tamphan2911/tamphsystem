ALTER TABLE "SuggestedJournal" ADD COLUMN "taskId" TEXT;
ALTER TABLE "SuggestedConference" ADD COLUMN "taskId" TEXT;

UPDATE "SuggestedJournal" AS suggestion
SET "taskId" = (
  SELECT task."id"
  FROM "ResearchTask" AS task
  INNER JOIN "ResearchTaskAssignment" AS assignment
    ON assignment."taskId" = task."id"
  WHERE task."projectId" = suggestion."projectId"
    AND task."taskType" = 'SUGGEST_VENUE'
    AND task."status" NOT IN ('COMPLETED', 'REVOKED')
    AND assignment."userId" = suggestion."createdById"
  ORDER BY task."updatedAt" DESC, task."createdAt" DESC
  LIMIT 1
)
WHERE suggestion."createdById" IS NOT NULL;

UPDATE "SuggestedConference" AS suggestion
SET "taskId" = (
  SELECT task."id"
  FROM "ResearchTask" AS task
  INNER JOIN "ResearchTaskAssignment" AS assignment
    ON assignment."taskId" = task."id"
  WHERE task."projectId" = suggestion."projectId"
    AND task."taskType" = 'SUGGEST_VENUE'
    AND task."status" NOT IN ('COMPLETED', 'REVOKED')
    AND assignment."userId" = suggestion."createdById"
  ORDER BY task."updatedAt" DESC, task."createdAt" DESC
  LIMIT 1
)
WHERE suggestion."createdById" IS NOT NULL;

CREATE INDEX "SuggestedJournal_taskId_idx" ON "SuggestedJournal"("taskId");
CREATE INDEX "SuggestedConference_taskId_idx" ON "SuggestedConference"("taskId");

ALTER TABLE "SuggestedJournal"
ADD CONSTRAINT "SuggestedJournal_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "ResearchTask"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SuggestedConference"
ADD CONSTRAINT "SuggestedConference_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "ResearchTask"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
