ALTER TYPE "ResearchStage" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "OrganizedProjectStatus" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TABLE "Proposal" ADD COLUMN "createdResearchProjectId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "createdOrganizedProjectId" TEXT;

CREATE UNIQUE INDEX "Proposal_createdResearchProjectId_key" ON "Proposal"("createdResearchProjectId");
CREATE UNIQUE INDEX "Proposal_createdOrganizedProjectId_key" ON "Proposal"("createdOrganizedProjectId");

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_createdResearchProjectId_fkey"
  FOREIGN KEY ("createdResearchProjectId")
  REFERENCES "ResearchProject"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_createdOrganizedProjectId_fkey"
  FOREIGN KEY ("createdOrganizedProjectId")
  REFERENCES "OrganizedProject"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
