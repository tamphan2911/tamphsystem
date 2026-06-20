ALTER TABLE "ResearchTask"
ADD COLUMN "taskFileName" TEXT,
ADD COLUMN "taskFileType" TEXT,
ADD COLUMN "taskFileSize" INTEGER,
ADD COLUMN "taskFileData" BYTEA;
