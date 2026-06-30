CREATE TABLE IF NOT EXISTS "ResearchChangeLog" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResearchChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ResearchChangeLog_entityType_entityId_createdAt_idx"
  ON "ResearchChangeLog"("entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "ResearchChangeLog_actorId_idx"
  ON "ResearchChangeLog"("actorId");

DO $$
BEGIN
  ALTER TABLE "ResearchChangeLog"
    ADD CONSTRAINT "ResearchChangeLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
