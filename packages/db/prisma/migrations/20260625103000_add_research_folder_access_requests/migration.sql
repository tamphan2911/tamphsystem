-- CreateEnum
CREATE TYPE "ResearchFolderAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "ResearchFolderAccessRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL,
    "status" "ResearchFolderAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchFolderAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchFolderAccessRequest_projectId_status_createdAt_idx" ON "ResearchFolderAccessRequest"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchFolderAccessRequest_userId_status_idx" ON "ResearchFolderAccessRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "ResearchFolderAccessRequest" ADD CONSTRAINT "ResearchFolderAccessRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchFolderAccessRequest" ADD CONSTRAINT "ResearchFolderAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchFolderAccessRequest" ADD CONSTRAINT "ResearchFolderAccessRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
