-- Keep the production research schema aligned with the current Prisma models.
-- This migration is intentionally idempotent because earlier research changes
-- were applied through a mix of schema edits and late migrations.

ALTER TYPE "ResearchStage" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "ConferenceSubmissionStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "CurrencyCode" ADD VALUE IF NOT EXISTS 'CHF';
ALTER TYPE "CurrencyCode" ADD VALUE IF NOT EXISTS 'GBP';
ALTER TYPE "CurrencyCode" ADD VALUE IF NOT EXISTS 'EUR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResearchTaskType') THEN
    CREATE TYPE "ResearchTaskType" AS ENUM (
      'SUBMIT_RESEARCH',
      'SUBMIT_CONFERENCE',
      'PRODUCTION',
      'REVIEW',
      'PROJECT_PRODUCTION',
      'PROJECT_RESEARCH_ASSOCIATED',
      'OTHER'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizedProjectStatus') THEN
    CREATE TYPE "OrganizedProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizedProjectFinancialClaimStatus') THEN
    CREATE TYPE "OrganizedProjectFinancialClaimStatus" AS ENUM (
      'NONE',
      'NOT_ADVANCED',
      'ADVANCED',
      'SETTLED',
      'REFUND_ADVANCE'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FundingInstitution" (
  "id" TEXT NOT NULL,
  "funderCode" TEXT,
  "name" TEXT NOT NULL,
  "shortName" TEXT,
  "country" TEXT,
  "website" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundingInstitution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE IF EXISTS "ResearchProject"
  ADD COLUMN IF NOT EXISTS "registrationUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "fundingInstitutionId" TEXT,
  ADD COLUMN IF NOT EXISTS "contentUnlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "productionTimelineLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "completedProductionSteps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "OrganizedProject" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "organizer" TEXT,
  "referenceCode" TEXT,
  "description" TEXT,
  "status" "OrganizedProjectStatus" NOT NULL DEFAULT 'PLANNED',
  "financialClaimStatus" "OrganizedProjectFinancialClaimStatus" NOT NULL DEFAULT 'NONE',
  "requiredResearchCount" INTEGER,
  "requiredProducts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "completedProducts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "fundingAmount" DECIMAL(65,30),
  "fundingCurrency" "CurrencyCode" NOT NULL DEFAULT 'VND',
  "startDate" TIMESTAMP(3),
  "durationMonths" INTEGER,
  "endDate" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "fundingInstitutionId" TEXT,
  CONSTRAINT "OrganizedProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizedProjectMember" (
  "id" TEXT NOT NULL,
  "organizedProjectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "isTeamLead" BOOLEAN NOT NULL DEFAULT false,
  "isInstructor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizedProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizedProjectResearch" (
  "id" TEXT NOT NULL,
  "organizedProjectId" TEXT NOT NULL,
  "researchProjectId" TEXT NOT NULL,
  "resultNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizedProjectResearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResearchProjectAuthor" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "isCorresponding" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResearchProjectAuthor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResearchAuthorNotification" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" "ResearchAuthorNotificationType" NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentById" TEXT,
  "results" JSONB NOT NULL,
  CONSTRAINT "ResearchAuthorNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SuggestedJournal" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "journalId" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuggestedJournal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SuggestedConference" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "conferenceId" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuggestedConference_pkey" PRIMARY KEY ("id")
);

ALTER TABLE IF EXISTS "ResearchTask"
  ADD COLUMN IF NOT EXISTS "organizedProjectId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewId" TEXT,
  ADD COLUMN IF NOT EXISTS "accountId" TEXT,
  ADD COLUMN IF NOT EXISTS "taskType" "ResearchTaskType",
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "adminViewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "ResearchTaskClarification" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "answeredById" TEXT,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResearchTaskClarification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE IF EXISTS "Conference"
  ADD COLUMN IF NOT EXISTS "isbn" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionFee" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionFeeCurrency" "CurrencyCode" NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "editUnlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS "Journal"
  ADD COLUMN IF NOT EXISTS "fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionFee" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionFeeCurrency" "CurrencyCode" NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS "PublisherAccount"
  ADD COLUMN IF NOT EXISTS "journalId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS "AcademicReview"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "FundingInstitution_funderCode_key" ON "FundingInstitution"("funderCode");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizedProjectMember_organizedProjectId_userId_key" ON "OrganizedProjectMember"("organizedProjectId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizedProjectResearch_organizedProjectId_researchProjectId_key" ON "OrganizedProjectResearch"("organizedProjectId", "researchProjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchProjectAuthor_projectId_userId_key" ON "ResearchProjectAuthor"("projectId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchAuthorNotification_projectId_type_key" ON "ResearchAuthorNotification"("projectId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "SuggestedJournal_projectId_journalId_key" ON "SuggestedJournal"("projectId", "journalId");
CREATE UNIQUE INDEX IF NOT EXISTS "SuggestedConference_projectId_conferenceId_key" ON "SuggestedConference"("projectId", "conferenceId");
CREATE UNIQUE INDEX IF NOT EXISTS "Conference_isbn_key" ON "Conference"("isbn");

CREATE INDEX IF NOT EXISTS "ResearchProject_registrationUserId_idx" ON "ResearchProject"("registrationUserId");
CREATE INDEX IF NOT EXISTS "ResearchProject_fundingInstitutionId_idx" ON "ResearchProject"("fundingInstitutionId");
CREATE INDEX IF NOT EXISTS "OrganizedProject_status_idx" ON "OrganizedProject"("status");
CREATE INDEX IF NOT EXISTS "OrganizedProject_financialClaimStatus_idx" ON "OrganizedProject"("financialClaimStatus");
CREATE INDEX IF NOT EXISTS "OrganizedProject_fundingInstitutionId_idx" ON "OrganizedProject"("fundingInstitutionId");
CREATE INDEX IF NOT EXISTS "OrganizedProjectMember_organizedProjectId_position_idx" ON "OrganizedProjectMember"("organizedProjectId", "position");
CREATE INDEX IF NOT EXISTS "OrganizedProjectMember_userId_idx" ON "OrganizedProjectMember"("userId");
CREATE INDEX IF NOT EXISTS "OrganizedProjectResearch_researchProjectId_idx" ON "OrganizedProjectResearch"("researchProjectId");
CREATE INDEX IF NOT EXISTS "ResearchProjectAuthor_projectId_position_idx" ON "ResearchProjectAuthor"("projectId", "position");
CREATE INDEX IF NOT EXISTS "ResearchAuthorNotification_projectId_idx" ON "ResearchAuthorNotification"("projectId");
CREATE INDEX IF NOT EXISTS "ResearchTaskClarification_taskId_createdAt_idx" ON "ResearchTaskClarification"("taskId", "createdAt");
