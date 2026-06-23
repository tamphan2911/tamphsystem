ALTER TABLE "SuggestedJournal" ADD COLUMN "journalCreationTaskId" TEXT;

CREATE UNIQUE INDEX "SuggestedJournal_journalCreationTaskId_key"
ON "SuggestedJournal"("journalCreationTaskId");
CREATE INDEX "SuggestedJournal_journalCreationTaskId_idx"
ON "SuggestedJournal"("journalCreationTaskId");

ALTER TABLE "SuggestedJournal"
ADD CONSTRAINT "SuggestedJournal_journalCreationTaskId_fkey"
FOREIGN KEY ("journalCreationTaskId") REFERENCES "ResearchTask"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
