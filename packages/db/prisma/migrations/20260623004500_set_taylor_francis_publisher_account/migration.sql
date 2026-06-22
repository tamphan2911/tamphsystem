DROP TABLE IF EXISTS "taylor_francis_account_target";
CREATE TEMP TABLE "taylor_francis_account_target" AS
SELECT DISTINCT ON (account."publisherId")
  account."id" AS "survivorId",
  account."publisherId"
FROM "PublisherAccount" AS account
JOIN "Publisher" AS publisher ON publisher."id" = account."publisherId"
WHERE publisher."normalizedName" IN (
  'taylor & francis',
  'taylor and francis',
  'taylor & francis group',
  'taylor and francis group'
)
ORDER BY
  account."publisherId",
  (
    SELECT COUNT(*) FROM "ResearchSubmission" AS submission
    WHERE submission."accountId" = account."id"
  ) + (
    SELECT COUNT(*) FROM "AcademicReview" AS review
    WHERE review."accountId" = account."id"
  ) + (
    SELECT COUNT(*) FROM "ResearchTask" AS task
    WHERE task."accountId" = account."id"
  ) DESC,
  CASE WHEN account."accountType" = 'PUBLISHER' THEN 0 ELSE 1 END,
  account."createdAt",
  account."id";

DROP TABLE IF EXISTS "taylor_francis_account_merge_map";
CREATE TEMP TABLE "taylor_francis_account_merge_map" AS
SELECT
  account."id" AS "duplicateId",
  target."survivorId"
FROM "PublisherAccount" AS account
JOIN "taylor_francis_account_target" AS target
  ON target."publisherId" = account."publisherId"
WHERE account."id" <> target."survivorId";

UPDATE "ResearchSubmission" AS submission
SET "accountId" = merge_map."survivorId"
FROM "taylor_francis_account_merge_map" AS merge_map
WHERE submission."accountId" = merge_map."duplicateId";

UPDATE "AcademicReview" AS review
SET "accountId" = merge_map."survivorId"
FROM "taylor_francis_account_merge_map" AS merge_map
WHERE review."accountId" = merge_map."duplicateId";

UPDATE "ResearchTask" AS task
SET "accountId" = merge_map."survivorId"
FROM "taylor_francis_account_merge_map" AS merge_map
WHERE task."accountId" = merge_map."duplicateId";

UPDATE "PublisherAccount" AS survivor
SET
  "accountType" = 'PUBLISHER',
  "publisherId" = target."publisherId",
  "journalId" = NULL,
  "email" = COALESCE(
    NULLIF(BTRIM(survivor."email"), ''),
    merged."email"
  ),
  "note" = COALESCE(
    NULLIF(BTRIM(survivor."note"), ''),
    merged."note"
  ),
  "updatedAt" = CURRENT_TIMESTAMP
FROM "taylor_francis_account_target" AS target
LEFT JOIN (
  SELECT
    merge_map."survivorId",
    MAX(NULLIF(BTRIM(duplicate."email"), '')) AS "email",
    MAX(NULLIF(BTRIM(duplicate."note"), '')) AS "note"
  FROM "taylor_francis_account_merge_map" AS merge_map
  JOIN "PublisherAccount" AS duplicate
    ON duplicate."id" = merge_map."duplicateId"
  GROUP BY merge_map."survivorId"
) AS merged ON merged."survivorId" = target."survivorId"
WHERE survivor."id" = target."survivorId";

DELETE FROM "PublisherAccount" AS account
USING "taylor_francis_account_merge_map" AS merge_map
WHERE account."id" = merge_map."duplicateId";

UPDATE "Publisher"
SET
  "usesSingleAccount" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "normalizedName" IN (
  'taylor & francis',
  'taylor and francis',
  'taylor & francis group',
  'taylor and francis group'
);
