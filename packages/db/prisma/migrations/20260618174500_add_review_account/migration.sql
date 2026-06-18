ALTER TABLE "AcademicReview"
  ADD COLUMN "accountId" TEXT;

ALTER TABLE "AcademicReview"
  ADD CONSTRAINT "AcademicReview_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PublisherAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AcademicReview_accountId_idx"
  ON "AcademicReview"("accountId");
