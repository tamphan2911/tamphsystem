CREATE TABLE "ResearchTeamParticipant" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResearchTeamParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResearchTeamParticipant_projectId_teamId_userId_key" ON "ResearchTeamParticipant"("projectId", "teamId", "userId");
CREATE INDEX "ResearchTeamParticipant_teamId_idx" ON "ResearchTeamParticipant"("teamId");
CREATE INDEX "ResearchTeamParticipant_userId_idx" ON "ResearchTeamParticipant"("userId");

ALTER TABLE "ResearchTeamParticipant"
  ADD CONSTRAINT "ResearchTeamParticipant_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchTeamParticipant"
  ADD CONSTRAINT "ResearchTeamParticipant_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "ResearchAssistantTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchTeamParticipant"
  ADD CONSTRAINT "ResearchTeamParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
