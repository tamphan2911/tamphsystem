ALTER TABLE "ResearchTask" ADD COLUMN "suggestedVenueTargetCount" INTEGER;

UPDATE "ResearchTask" AS task
SET "suggestedVenueTargetCount" = approved.count
FROM (
  SELECT
    task.id,
    COUNT(suggestion.id)::INTEGER AS count
  FROM "ResearchTask" AS task
  LEFT JOIN (
    SELECT "taskId" AS "taskId", id
    FROM "SuggestedJournal"
    WHERE status = 'APPROVED' AND "taskId" IS NOT NULL
    UNION ALL
    SELECT "taskId" AS "taskId", id
    FROM "SuggestedConference"
    WHERE status = 'APPROVED' AND "taskId" IS NOT NULL
  ) AS suggestion ON suggestion."taskId" = task.id
  WHERE task."taskType" = 'SUGGEST_VENUE'
    AND task.status = 'COMPLETED'
  GROUP BY task.id
) AS approved
WHERE task.id = approved.id;

UPDATE "ResearchTask"
SET "suggestedVenueTargetCount" = 2
WHERE "taskType" = 'SUGGEST_VENUE'
  AND status <> 'COMPLETED';
