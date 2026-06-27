ALTER TABLE "TaskGuide"
ADD COLUMN "supportFileName" TEXT,
ADD COLUMN "supportFileType" TEXT,
ADD COLUMN "supportFileSize" INTEGER,
ADD COLUMN "supportFileData" BYTEA;
