CREATE TYPE "JournalApprovalStatus" AS ENUM ('APPROVED', 'PENDING_APPROVAL');

ALTER TABLE "Journal"
ADD COLUMN "approvalStatus" "JournalApprovalStatus" NOT NULL DEFAULT 'APPROVED';

UPDATE "Journal"
SET "createdById" = (
  SELECT "id"
  FROM "User"
  WHERE "roles" @> ARRAY['ADMIN']::"Role"[]
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "createdById" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "User"
    WHERE "roles" @> ARRAY['ADMIN']::"Role"[]
  );

CREATE INDEX "Journal_approvalStatus_idx" ON "Journal"("approvalStatus");
