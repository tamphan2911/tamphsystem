WITH journal_account_options AS (
  SELECT
    journal."id" AS "journalId",
    account."id" AS "accountId"
  FROM "Journal" AS journal
  JOIN "Publisher" AS publisher
    ON publisher."id" = journal."publisherId"
    AND publisher."usesSingleAccount" = TRUE
  JOIN "PublisherAccount" AS account
    ON account."publisherId" = publisher."id"
    AND account."accountType" = 'PUBLISHER'

  UNION ALL

  SELECT
    journal."id" AS "journalId",
    account."id" AS "accountId"
  FROM "Journal" AS journal
  LEFT JOIN "Publisher" AS publisher
    ON publisher."id" = journal."publisherId"
  JOIN "PublisherAccount" AS account
    ON account."journalId" = journal."id"
    AND account."accountType" = 'JOURNAL'
  WHERE COALESCE(publisher."usesSingleAccount", FALSE) = FALSE
),
ranked_task_accounts AS (
  SELECT DISTINCT ON (task."projectId", task."journalId")
    task."projectId",
    task."journalId",
    task."accountId"
  FROM "ResearchTask" AS task
  JOIN journal_account_options AS option
    ON option."journalId" = task."journalId"
    AND option."accountId" = task."accountId"
  WHERE task."taskType" = 'SUBMIT_RESEARCH'
    AND task."status" = 'COMPLETED'
    AND task."projectId" IS NOT NULL
    AND task."journalId" IS NOT NULL
    AND task."accountId" IS NOT NULL
  ORDER BY
    task."projectId",
    task."journalId",
    task."completedAt" DESC NULLS LAST,
    task."updatedAt" DESC,
    task."id"
)
UPDATE "ResearchSubmission" AS submission
SET "accountId" = task_account."accountId"
FROM ranked_task_accounts AS task_account
WHERE submission."accountId" IS NULL
  AND submission."researchProjectId" = task_account."projectId"
  AND submission."journalId" = task_account."journalId";

WITH journal_account_options AS (
  SELECT
    journal."id" AS "journalId",
    account."id" AS "accountId"
  FROM "Journal" AS journal
  JOIN "Publisher" AS publisher
    ON publisher."id" = journal."publisherId"
    AND publisher."usesSingleAccount" = TRUE
  JOIN "PublisherAccount" AS account
    ON account."publisherId" = publisher."id"
    AND account."accountType" = 'PUBLISHER'

  UNION ALL

  SELECT
    journal."id" AS "journalId",
    account."id" AS "accountId"
  FROM "Journal" AS journal
  LEFT JOIN "Publisher" AS publisher
    ON publisher."id" = journal."publisherId"
  JOIN "PublisherAccount" AS account
    ON account."journalId" = journal."id"
    AND account."accountType" = 'JOURNAL'
  WHERE COALESCE(publisher."usesSingleAccount", FALSE) = FALSE
),
single_journal_account AS (
  SELECT
    "journalId",
    MIN("accountId") AS "accountId"
  FROM journal_account_options
  GROUP BY "journalId"
  HAVING COUNT(*) = 1
)
UPDATE "ResearchSubmission" AS submission
SET "accountId" = single_account."accountId"
FROM single_journal_account AS single_account
WHERE submission."accountId" IS NULL
  AND submission."journalId" = single_account."journalId";
