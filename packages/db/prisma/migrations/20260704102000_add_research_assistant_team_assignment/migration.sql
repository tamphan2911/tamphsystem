ALTER TABLE "ResearchProject" ADD COLUMN "assistantTeamId" TEXT;

ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_assistantTeamId_fkey" FOREIGN KEY ("assistantTeamId") REFERENCES "ResearchAssistantTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ResearchProject_assistantTeamId_idx" ON "ResearchProject"("assistantTeamId");

DROP INDEX IF EXISTS "ResearchAssistantTeamMember_userId_key";

DROP INDEX IF EXISTS "ResearchAssistantTeam_leaderId_idx";
CREATE UNIQUE INDEX "ResearchAssistantTeam_leaderId_key" ON "ResearchAssistantTeam"("leaderId");
