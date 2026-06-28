-- CreateTable
CREATE TABLE "AssistantWorkflowGuide" (
    "id" TEXT NOT NULL,
    "guideCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "workflow" JSONB,
    "supportFileName" TEXT,
    "supportFileType" TEXT,
    "supportFileSize" INTEGER,
    "supportFileData" BYTEA,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantWorkflowGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistantWorkflowGuide_guideCode_key" ON "AssistantWorkflowGuide"("guideCode");

-- CreateIndex
CREATE INDEX "AssistantWorkflowGuide_createdById_idx" ON "AssistantWorkflowGuide"("createdById");

-- CreateIndex
CREATE INDEX "AssistantWorkflowGuide_updatedAt_idx" ON "AssistantWorkflowGuide"("updatedAt");

-- AddForeignKey
ALTER TABLE "AssistantWorkflowGuide" ADD CONSTRAINT "AssistantWorkflowGuide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
