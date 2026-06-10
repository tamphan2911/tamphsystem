ALTER TABLE "ResearchSubmission"
ADD COLUMN "articleUrl" TEXT,
ADD COLUMN "articleFileName" TEXT,
ADD COLUMN "articleFileType" TEXT,
ADD COLUMN "articleFileSize" INTEGER,
ADD COLUMN "articleFileData" BYTEA;
