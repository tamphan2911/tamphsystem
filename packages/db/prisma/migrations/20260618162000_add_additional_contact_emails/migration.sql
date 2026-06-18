ALTER TABLE "User"
  ADD COLUMN "additionalEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "ResearchProjectAuthor"
  ADD COLUMN "selectedEmail" TEXT;

ALTER TABLE "OrganizedProjectMember"
  ADD COLUMN "selectedEmail" TEXT;
