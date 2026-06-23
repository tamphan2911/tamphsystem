CREATE TABLE "SuggestedReviewer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "institution" TEXT,
  "bio" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SuggestedReviewer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuggestedReviewer_email_key" ON "SuggestedReviewer"("email");
CREATE INDEX "SuggestedReviewer_name_idx" ON "SuggestedReviewer"("name");
CREATE INDEX "SuggestedReviewer_institution_idx" ON "SuggestedReviewer"("institution");
CREATE INDEX "SuggestedReviewer_updatedAt_idx" ON "SuggestedReviewer"("updatedAt");

ALTER TABLE "SuggestedReviewer"
  ADD CONSTRAINT "SuggestedReviewer_createdById_fkey"
  FOREIGN KEY ("createdById")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE TABLE "_ResearchTaskSuggestedReviewers" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_ResearchTaskSuggestedReviewers_AB_unique"
  ON "_ResearchTaskSuggestedReviewers"("A", "B");
CREATE INDEX "_ResearchTaskSuggestedReviewers_B_index"
  ON "_ResearchTaskSuggestedReviewers"("B");

ALTER TABLE "_ResearchTaskSuggestedReviewers"
  ADD CONSTRAINT "_ResearchTaskSuggestedReviewers_A_fkey"
  FOREIGN KEY ("A")
  REFERENCES "ResearchTask"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "_ResearchTaskSuggestedReviewers"
  ADD CONSTRAINT "_ResearchTaskSuggestedReviewers_B_fkey"
  FOREIGN KEY ("B")
  REFERENCES "SuggestedReviewer"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
