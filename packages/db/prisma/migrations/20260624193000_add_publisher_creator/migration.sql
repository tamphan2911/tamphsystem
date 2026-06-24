-- Add creator ownership for publisher access control.
ALTER TABLE "Publisher" ADD COLUMN "createdById" TEXT;

UPDATE "Publisher" AS publisher
SET "createdById" = journal."createdById"
FROM (
  SELECT DISTINCT ON ("publisherId") "publisherId", "createdById"
  FROM "Journal"
  WHERE "publisherId" IS NOT NULL AND "createdById" IS NOT NULL
  ORDER BY "publisherId", "createdAt" ASC
) AS journal
WHERE publisher."id" = journal."publisherId"
  AND publisher."createdById" IS NULL;

ALTER TABLE "Publisher"
ADD CONSTRAINT "Publisher_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Publisher_createdById_idx" ON "Publisher"("createdById");
