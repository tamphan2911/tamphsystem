ALTER TABLE "SuggestedJournal"
ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SuggestedConference"
ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SuggestedJournal"
SET "requiresApproval" = true
WHERE "status" = 'PENDING'
   OR (
     "approvedAt" IS NOT NULL
     AND "approvedAt" > "createdAt" + INTERVAL '1 second'
   );

UPDATE "SuggestedConference"
SET "requiresApproval" = true
WHERE "status" = 'PENDING'
   OR (
     "approvedAt" IS NOT NULL
     AND "approvedAt" > "createdAt" + INTERVAL '1 second'
   );

UPDATE "SuggestedJournal"
SET "approvedById" = NULL
WHERE "approvedById" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "User"."id" = "SuggestedJournal"."approvedById"
  );

UPDATE "SuggestedConference"
SET "approvedById" = NULL
WHERE "approvedById" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "User"."id" = "SuggestedConference"."approvedById"
  );

ALTER TABLE "SuggestedJournal"
ADD CONSTRAINT "SuggestedJournal_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SuggestedConference"
ADD CONSTRAINT "SuggestedConference_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SuggestedJournal_approvedById_idx"
ON "SuggestedJournal"("approvedById");

CREATE INDEX "SuggestedConference_approvedById_idx"
ON "SuggestedConference"("approvedById");
