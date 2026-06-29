WITH add_journal_tasks_ready AS (
  SELECT
    task."id"
  FROM "ResearchTask" AS task
  JOIN "Journal" AS journal
    ON journal."resultTaskId" = task."id"
    AND journal."resultPosition" IS NOT NULL
  LEFT JOIN "Publisher" AS publisher
    ON publisher."id" = journal."publisherId"
  WHERE task."taskType" = 'ADD_JOURNAL'
    AND task."status" NOT IN ('COMPLETED', 'REVOKED', 'CHECKING')
  GROUP BY task."id", task."journalTargetCount"
  HAVING COUNT(journal."id") >= GREATEST(COALESCE(task."journalTargetCount", 1), 1)
    AND (
      BOOL_OR(journal."approvalStatus" <> 'APPROVED')
      OR BOOL_OR(COALESCE(publisher."approvalStatus", 'APPROVED') <> 'APPROVED')
    )
)
UPDATE "ResearchTask" AS task
SET
  "status" = 'CHECKING',
  "completedAt" = NULL,
  "revokedAt" = NULL,
  "adminViewedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
FROM add_journal_tasks_ready AS ready_task
WHERE task."id" = ready_task."id";

WITH add_journal_tasks_ready AS (
  SELECT
    task."id"
  FROM "ResearchTask" AS task
  JOIN "Journal" AS journal
    ON journal."resultTaskId" = task."id"
    AND journal."resultPosition" IS NOT NULL
  LEFT JOIN "Publisher" AS publisher
    ON publisher."id" = journal."publisherId"
  WHERE task."taskType" = 'ADD_JOURNAL'
    AND task."status" = 'CHECKING'
  GROUP BY task."id", task."journalTargetCount"
  HAVING COUNT(journal."id") >= GREATEST(COALESCE(task."journalTargetCount", 1), 1)
    AND (
      BOOL_OR(journal."approvalStatus" <> 'APPROVED')
      OR BOOL_OR(COALESCE(publisher."approvalStatus", 'APPROVED') <> 'APPROVED')
    )
)
UPDATE "ResearchTaskAssignment" AS assignment
SET "finishedAt" = COALESCE(assignment."finishedAt", CURRENT_TIMESTAMP)
FROM add_journal_tasks_ready AS ready_task
WHERE assignment."taskId" = ready_task."id";
