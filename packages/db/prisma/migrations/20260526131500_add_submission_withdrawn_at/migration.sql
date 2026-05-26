-- AlterTable
ALTER TABLE "ResearchSubmission" ADD COLUMN "withdrawnAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ConferenceSubmission" ADD COLUMN "withdrawnAt" TIMESTAMP(3);
