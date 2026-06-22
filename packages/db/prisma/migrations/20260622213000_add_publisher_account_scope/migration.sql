DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PublisherAccountType') THEN
    CREATE TYPE "PublisherAccountType" AS ENUM ('JOURNAL', 'PUBLISHER');
  END IF;
END $$;

ALTER TABLE "PublisherAccount"
  ADD COLUMN IF NOT EXISTS "accountType" "PublisherAccountType" NOT NULL DEFAULT 'JOURNAL',
  ADD COLUMN IF NOT EXISTS "publisherId" TEXT;

UPDATE "PublisherAccount" AS account
SET "publisherId" = journal."publisherId"
FROM "Journal" AS journal
WHERE account."journalId" = journal."id"
  AND account."publisherId" IS NULL
  AND journal."publisherId" IS NOT NULL;

DROP TABLE IF EXISTS "publisher_account_merge_map";
CREATE TEMP TABLE "publisher_account_merge_map" (
  "duplicateId" TEXT PRIMARY KEY,
  "survivorId" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL
);

INSERT INTO "publisher_account_merge_map" ("duplicateId", "survivorId", "publisherId")
WITH ranked_accounts AS (
  SELECT
    account."id",
    account."publisherId",
    FIRST_VALUE(account."id") OVER (
      PARTITION BY
        account."publisherId",
        LOWER(BTRIM(account."username")),
        account."password"
      ORDER BY account."createdAt", account."id"
    ) AS "survivorId",
    COUNT(*) OVER (
      PARTITION BY
        account."publisherId",
        LOWER(BTRIM(account."username")),
        account."password"
    ) AS "duplicateCount"
  FROM "PublisherAccount" AS account
  WHERE account."publisherId" IS NOT NULL
)
SELECT "id", "survivorId", "publisherId"
FROM ranked_accounts
WHERE "duplicateCount" > 1
  AND "id" <> "survivorId";

UPDATE "ResearchSubmission" AS submission
SET "accountId" = merge_map."survivorId"
FROM "publisher_account_merge_map" AS merge_map
WHERE submission."accountId" = merge_map."duplicateId";

UPDATE "AcademicReview" AS review
SET "accountId" = merge_map."survivorId"
FROM "publisher_account_merge_map" AS merge_map
WHERE review."accountId" = merge_map."duplicateId";

UPDATE "ResearchTask" AS task
SET "accountId" = merge_map."survivorId"
FROM "publisher_account_merge_map" AS merge_map
WHERE task."accountId" = merge_map."duplicateId";

UPDATE "PublisherAccount" AS account
SET
  "accountType" = 'PUBLISHER',
  "publisherId" = survivor."publisherId",
  "journalId" = NULL,
  "email" = COALESCE(
    NULLIF(BTRIM(account."email"), ''),
    survivor."mergedEmail"
  ),
  "note" = COALESCE(
    NULLIF(BTRIM(account."note"), ''),
    survivor."mergedNote"
  ),
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT
    merge_map."survivorId",
    merge_map."publisherId",
    MAX(NULLIF(BTRIM(duplicate."email"), '')) AS "mergedEmail",
    MAX(NULLIF(BTRIM(duplicate."note"), '')) AS "mergedNote"
  FROM "publisher_account_merge_map" AS merge_map
  JOIN "PublisherAccount" AS duplicate
    ON duplicate."id" = merge_map."duplicateId"
  GROUP BY merge_map."survivorId", merge_map."publisherId"
) AS survivor
WHERE account."id" = survivor."survivorId";

DELETE FROM "PublisherAccount" AS account
USING "publisher_account_merge_map" AS merge_map
WHERE account."id" = merge_map."duplicateId";

CREATE INDEX IF NOT EXISTS "PublisherAccount_journalId_idx"
  ON "PublisherAccount"("journalId");
CREATE INDEX IF NOT EXISTS "PublisherAccount_publisherId_idx"
  ON "PublisherAccount"("publisherId");
CREATE INDEX IF NOT EXISTS "PublisherAccount_accountType_idx"
  ON "PublisherAccount"("accountType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PublisherAccount_publisherId_fkey'
  ) THEN
    ALTER TABLE "PublisherAccount"
      ADD CONSTRAINT "PublisherAccount_publisherId_fkey"
      FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
