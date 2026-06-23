-- Link approved suggested venues to the submit task created from approval.
ALTER TABLE "SuggestedJournal" ADD COLUMN "submissionTaskId" TEXT;
ALTER TABLE "SuggestedConference" ADD COLUMN "submissionTaskId" TEXT;

CREATE UNIQUE INDEX "SuggestedJournal_submissionTaskId_key" ON "SuggestedJournal"("submissionTaskId");
CREATE UNIQUE INDEX "SuggestedConference_submissionTaskId_key" ON "SuggestedConference"("submissionTaskId");

CREATE INDEX "SuggestedJournal_submissionTaskId_idx" ON "SuggestedJournal"("submissionTaskId");
CREATE INDEX "SuggestedConference_submissionTaskId_idx" ON "SuggestedConference"("submissionTaskId");

ALTER TABLE "SuggestedJournal"
  ADD CONSTRAINT "SuggestedJournal_submissionTaskId_fkey"
  FOREIGN KEY ("submissionTaskId") REFERENCES "ResearchTask"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SuggestedConference"
  ADD CONSTRAINT "SuggestedConference_submissionTaskId_fkey"
  FOREIGN KEY ("submissionTaskId") REFERENCES "ResearchTask"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
