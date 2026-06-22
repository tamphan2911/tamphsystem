CREATE TABLE "TaskGuide" (
  "id" TEXT NOT NULL,
  "taskType" "ResearchTaskType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskGuide_taskType_key" ON "TaskGuide"("taskType");
CREATE INDEX "TaskGuide_createdById_idx" ON "TaskGuide"("createdById");
CREATE INDEX "TaskGuide_updatedAt_idx" ON "TaskGuide"("updatedAt");

ALTER TABLE "TaskGuide"
ADD CONSTRAINT "TaskGuide_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
