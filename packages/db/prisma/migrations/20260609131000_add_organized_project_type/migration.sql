CREATE TYPE "OrganizedProjectType" AS ENUM ('STUDENT', 'FACULTY', 'UNIVERSITY', 'VNU', 'NATIONAL');

ALTER TABLE "OrganizedProject"
  ADD COLUMN "projectType" "OrganizedProjectType" NOT NULL DEFAULT 'STUDENT';

CREATE INDEX "OrganizedProject_projectType_idx" ON "OrganizedProject"("projectType");
