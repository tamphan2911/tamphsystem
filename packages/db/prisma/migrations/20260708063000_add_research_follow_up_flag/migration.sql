-- Add a lightweight research marker for unfinished work that should be revisited later.
ALTER TABLE "ResearchProject"
ADD COLUMN "needsFollowUp" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ResearchProject_needsFollowUp_idx"
ON "ResearchProject"("needsFollowUp");
