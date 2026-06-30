ALTER TABLE "Journal"
  ADD COLUMN IF NOT EXISTS "resultApprovalNote" TEXT,
  ADD COLUMN IF NOT EXISTS "resultApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resultApprovedById" TEXT,
  ADD COLUMN IF NOT EXISTS "resultCorrectionNote" TEXT,
  ADD COLUMN IF NOT EXISTS "resultCorrectionRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resultCorrectionRequestedById" TEXT,
  ADD COLUMN IF NOT EXISTS "resultCorrectionResolvedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Journal_resultApprovedById_idx" ON "Journal"("resultApprovedById");
CREATE INDEX IF NOT EXISTS "Journal_resultCorrectionRequestedById_idx" ON "Journal"("resultCorrectionRequestedById");
