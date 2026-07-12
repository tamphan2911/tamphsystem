-- Ensure every existing production task includes the G014 task guide.
INSERT INTO "_ResearchTaskGuides" ("A", "B")
SELECT "ResearchTask"."id", "TaskGuide"."id"
FROM "ResearchTask"
CROSS JOIN "TaskGuide"
WHERE "ResearchTask"."taskType" = 'PRODUCTION'
  AND "TaskGuide"."guideCode" = 'G014'
  AND NOT EXISTS (
    SELECT 1
    FROM "_ResearchTaskGuides" existing
    WHERE existing."A" = "ResearchTask"."id"
      AND existing."B" = "TaskGuide"."id"
  );
