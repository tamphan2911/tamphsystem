-- Ensure every existing submit task includes the G026 task guide.
INSERT INTO "_ResearchTaskGuides" ("A", "B")
SELECT "ResearchTask"."id", "TaskGuide"."id"
FROM "ResearchTask"
CROSS JOIN "TaskGuide"
WHERE "ResearchTask"."taskType" IN ('SUBMIT_RESEARCH', 'SUBMIT_CONFERENCE')
  AND "TaskGuide"."guideCode" = 'G026'
  AND NOT EXISTS (
    SELECT 1
    FROM "_ResearchTaskGuides" existing
    WHERE existing."A" = "ResearchTask"."id"
      AND existing."B" = "TaskGuide"."id"
  );
