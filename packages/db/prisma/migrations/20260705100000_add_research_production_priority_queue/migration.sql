ALTER TABLE "ResearchProject" ADD COLUMN "productionPriorityQueuedAt" TIMESTAMP(3);

CREATE INDEX "ResearchProject_productionPriorityQueuedAt_idx" ON "ResearchProject"("productionPriorityQueuedAt");
