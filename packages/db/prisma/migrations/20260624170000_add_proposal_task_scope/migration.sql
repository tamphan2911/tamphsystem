CREATE TYPE "ProposalTaskScope" AS ENUM ('RESEARCH', 'PROJECT');

ALTER TABLE "ResearchTask"
ADD COLUMN "proposalScope" "ProposalTaskScope" NOT NULL DEFAULT 'RESEARCH';

UPDATE "ResearchTask"
SET "proposalScope" = 'PROJECT'
WHERE "taskType" = 'PROPOSAL'
  AND "organizedProjectId" IS NOT NULL
  AND "projectId" IS NULL;
