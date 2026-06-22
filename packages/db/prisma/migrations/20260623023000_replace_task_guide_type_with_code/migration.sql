ALTER TABLE "TaskGuide" ADD COLUMN "guideCode" TEXT;

WITH ranked_guides AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS guide_number
  FROM "TaskGuide"
)
UPDATE "TaskGuide" AS guide
SET "guideCode" = 'G' || LPAD(ranked.guide_number::TEXT, 3, '0')
FROM ranked_guides AS ranked
WHERE guide."id" = ranked."id";

ALTER TABLE "TaskGuide" ALTER COLUMN "guideCode" SET NOT NULL;
DROP INDEX "TaskGuide_taskType_key";
ALTER TABLE "TaskGuide" DROP COLUMN "taskType";
CREATE UNIQUE INDEX "TaskGuide_guideCode_key" ON "TaskGuide"("guideCode");
