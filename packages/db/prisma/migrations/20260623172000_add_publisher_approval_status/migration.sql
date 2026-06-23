ALTER TABLE "Publisher" ADD COLUMN "approvalStatus" "JournalApprovalStatus" NOT NULL DEFAULT 'APPROVED';

CREATE INDEX "Publisher_approvalStatus_idx" ON "Publisher"("approvalStatus");
