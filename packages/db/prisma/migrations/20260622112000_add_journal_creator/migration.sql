ALTER TABLE "Journal"
ADD COLUMN "createdById" TEXT;

ALTER TABLE "Journal"
ADD CONSTRAINT "Journal_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Journal_createdById_idx" ON "Journal"("createdById");
