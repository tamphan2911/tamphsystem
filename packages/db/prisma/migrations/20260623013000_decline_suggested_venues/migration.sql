ALTER TYPE "SuggestedVenueStatus" ADD VALUE IF NOT EXISTS 'DECLINED';

ALTER TABLE "SuggestedJournal"
ADD COLUMN "declinedAt" TIMESTAMP(3),
ADD COLUMN "declinedById" TEXT,
ADD COLUMN "declineReason" TEXT;

ALTER TABLE "SuggestedConference"
ADD COLUMN "declinedAt" TIMESTAMP(3),
ADD COLUMN "declinedById" TEXT,
ADD COLUMN "declineReason" TEXT;

ALTER TABLE "SuggestedJournal"
ADD CONSTRAINT "SuggestedJournal_declinedById_fkey"
FOREIGN KEY ("declinedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SuggestedConference"
ADD CONSTRAINT "SuggestedConference_declinedById_fkey"
FOREIGN KEY ("declinedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SuggestedJournal_declinedById_idx" ON "SuggestedJournal"("declinedById");
CREATE INDEX "SuggestedConference_declinedById_idx" ON "SuggestedConference"("declinedById");
