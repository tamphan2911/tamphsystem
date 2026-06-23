ALTER TYPE "ResearchTaskType" ADD VALUE IF NOT EXISTS 'SUGGEST_VENUE';

UPDATE "ResearchTask"
SET "taskType" = 'SUGGEST_VENUE'::"ResearchTaskType"
WHERE "taskType" = 'OTHER'
  AND "title" ILIKE 'Suggest venue for%';
