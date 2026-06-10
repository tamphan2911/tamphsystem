CREATE TYPE "SuggestedVenueStatus" AS ENUM ('PENDING', 'APPROVED');

ALTER TABLE "SuggestedJournal"
  ADD COLUMN "venueName" TEXT,
  ADD COLUMN "venueLink" TEXT,
  ADD COLUMN "status" "SuggestedVenueStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

ALTER TABLE "SuggestedConference"
  ADD COLUMN "venueName" TEXT,
  ADD COLUMN "venueLink" TEXT,
  ADD COLUMN "status" "SuggestedVenueStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

ALTER TABLE "SuggestedJournal"
  ALTER COLUMN "journalId" DROP NOT NULL;

ALTER TABLE "SuggestedConference"
  ALTER COLUMN "conferenceId" DROP NOT NULL;

UPDATE "SuggestedJournal"
SET "approvedAt" = "createdAt"
WHERE "approvedAt" IS NULL;

UPDATE "SuggestedConference"
SET "approvedAt" = "createdAt"
WHERE "approvedAt" IS NULL;

CREATE INDEX "SuggestedJournal_projectId_status_idx" ON "SuggestedJournal"("projectId", "status");
CREATE INDEX "SuggestedConference_projectId_status_idx" ON "SuggestedConference"("projectId", "status");
