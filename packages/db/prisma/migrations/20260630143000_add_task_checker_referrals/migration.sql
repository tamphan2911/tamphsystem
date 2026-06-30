ALTER TABLE "ResearchTask"
ADD COLUMN "checkerReferralTargetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "checkerReferralById" TEXT,
ADD COLUMN "checkerReferralAction" TEXT,
ADD COLUMN "checkerReferralAt" TIMESTAMP(3);

CREATE INDEX "ResearchTask_checkerReferralById_idx" ON "ResearchTask"("checkerReferralById");

ALTER TABLE "ResearchTask"
ADD CONSTRAINT "ResearchTask_checkerReferralById_fkey"
FOREIGN KEY ("checkerReferralById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
