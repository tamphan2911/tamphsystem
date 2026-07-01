DROP INDEX IF EXISTS "ResearchSubmission_researchProjectId_journalId_key";

CREATE INDEX IF NOT EXISTS "ResearchSubmission_researchProjectId_journalId_idx"
ON "ResearchSubmission"("researchProjectId", "journalId");
