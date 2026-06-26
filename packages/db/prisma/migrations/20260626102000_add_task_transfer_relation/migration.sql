-- AlterTable
ALTER TABLE "ResearchTask" ADD COLUMN "transferredFromTaskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ResearchTask_transferredFromTaskId_key" ON "ResearchTask"("transferredFromTaskId");

-- CreateIndex
CREATE INDEX "ResearchTask_transferredFromTaskId_idx" ON "ResearchTask"("transferredFromTaskId");

-- AddForeignKey
ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_transferredFromTaskId_fkey" FOREIGN KEY ("transferredFromTaskId") REFERENCES "ResearchTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
