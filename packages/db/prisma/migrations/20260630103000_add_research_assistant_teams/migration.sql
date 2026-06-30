CREATE TABLE IF NOT EXISTS "ResearchAssistantTeam" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "leaderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResearchAssistantTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResearchAssistantTeamMember" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResearchAssistantTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ResearchAssistantTeam_leaderId_idx" ON "ResearchAssistantTeam"("leaderId");
CREATE INDEX IF NOT EXISTS "ResearchAssistantTeam_updatedAt_idx" ON "ResearchAssistantTeam"("updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchAssistantTeamMember_userId_key" ON "ResearchAssistantTeamMember"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchAssistantTeamMember_teamId_userId_key" ON "ResearchAssistantTeamMember"("teamId", "userId");
CREATE INDEX IF NOT EXISTS "ResearchAssistantTeamMember_teamId_idx" ON "ResearchAssistantTeamMember"("teamId");

DO $$
BEGIN
  ALTER TABLE "ResearchAssistantTeam"
    ADD CONSTRAINT "ResearchAssistantTeam_leaderId_fkey"
    FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ResearchAssistantTeamMember"
    ADD CONSTRAINT "ResearchAssistantTeamMember_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "ResearchAssistantTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ResearchAssistantTeamMember"
    ADD CONSTRAINT "ResearchAssistantTeamMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
