INSERT INTO "_ResearchTaskGuides" ("A", "B")
SELECT task."id", guide."id"
FROM "TaskGuide" AS guide
CROSS JOIN "ResearchTask" AS task
WHERE guide."guideCode" = 'G023'
  AND task."taskType" = 'SUGGEST_VENUE'
ON CONFLICT DO NOTHING;
