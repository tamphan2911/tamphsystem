ALTER TABLE "ResearchTask"
ADD COLUMN "reportFileName" TEXT,
ADD COLUMN "reportFileType" TEXT,
ADD COLUMN "reportFileSize" INTEGER,
ADD COLUMN "reportFileData" BYTEA,
ADD COLUMN "reportUploadedAt" TIMESTAMP(3),
ADD COLUMN "reportUploadedById" TEXT;
