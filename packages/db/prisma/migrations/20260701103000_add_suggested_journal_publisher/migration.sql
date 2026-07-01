ALTER TABLE "SuggestedJournal" ADD COLUMN "publisherId" TEXT;

CREATE INDEX "SuggestedJournal_publisherId_idx"
ON "SuggestedJournal"("publisherId");

ALTER TABLE "SuggestedJournal"
ADD CONSTRAINT "SuggestedJournal_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
