ALTER TABLE "Publisher"
  ADD COLUMN IF NOT EXISTS "usesSingleAccount" BOOLEAN NOT NULL DEFAULT FALSE;

DROP TABLE IF EXISTS "named_publisher_merge_map";
CREATE TEMP TABLE "named_publisher_merge_map" (
  "duplicateId" TEXT PRIMARY KEY,
  "survivorId" TEXT NOT NULL,
  "canonicalName" TEXT NOT NULL
);

INSERT INTO "named_publisher_merge_map" (
  "duplicateId",
  "survivorId",
  "canonicalName"
)
WITH publisher_groups AS (
  SELECT
    publisher."id",
    publisher."createdAt",
    publisher."normalizedName",
    CASE
      WHEN publisher."normalizedName" IN (
        'inderscience',
        'inderscience enterprises ltd',
        'inderscience publishers'
      ) THEN 'Inderscience'
      WHEN publisher."normalizedName" IN (
        'emerald',
        'emerald group publishing ltd',
        'emerald group publishing ltd.'
      ) THEN 'Emerald'
      WHEN publisher."normalizedName" IN (
        'springer nature',
        'spring nature'
      ) THEN 'Springer Nature'
      ELSE NULL
    END AS "canonicalName"
  FROM "Publisher" AS publisher
), ranked_publishers AS (
  SELECT
    publisher_group.*,
    FIRST_VALUE(publisher_group."id") OVER (
      PARTITION BY publisher_group."canonicalName"
      ORDER BY
        CASE
          WHEN publisher_group."normalizedName" = LOWER(publisher_group."canonicalName")
            THEN 0
          ELSE 1
        END,
        publisher_group."createdAt",
        publisher_group."id"
    ) AS "survivorId"
  FROM publisher_groups AS publisher_group
  WHERE publisher_group."canonicalName" IS NOT NULL
)
SELECT "id", "survivorId", "canonicalName"
FROM ranked_publishers
WHERE "id" <> "survivorId";

UPDATE "Journal" AS journal
SET
  "publisherId" = merge_map."survivorId",
  "publisher" = merge_map."canonicalName"
FROM "named_publisher_merge_map" AS merge_map
WHERE journal."publisherId" = merge_map."duplicateId";

UPDATE "PublisherAccount" AS account
SET "publisherId" = merge_map."survivorId"
FROM "named_publisher_merge_map" AS merge_map
WHERE account."publisherId" = merge_map."duplicateId";

UPDATE "Publisher" AS survivor
SET
  "website" = COALESCE(
    NULLIF(BTRIM(survivor."website"), ''),
    merged."website"
  ),
  "note" = COALESCE(
    NULLIF(BTRIM(survivor."note"), ''),
    merged."note"
  ),
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT
    merge_map."survivorId",
    MAX(NULLIF(BTRIM(duplicate."website"), '')) AS "website",
    MAX(NULLIF(BTRIM(duplicate."note"), '')) AS "note"
  FROM "named_publisher_merge_map" AS merge_map
  JOIN "Publisher" AS duplicate ON duplicate."id" = merge_map."duplicateId"
  GROUP BY merge_map."survivorId"
) AS merged
WHERE survivor."id" = merged."survivorId";

DELETE FROM "Publisher" AS publisher
USING "named_publisher_merge_map" AS merge_map
WHERE publisher."id" = merge_map."duplicateId";

UPDATE "Publisher" AS survivor
SET
  "name" = canonical."canonicalName",
  "normalizedName" = LOWER(canonical."canonicalName"),
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "survivorId", "canonicalName"
  FROM "named_publisher_merge_map"
) AS canonical
WHERE survivor."id" = canonical."survivorId";

UPDATE "Publisher"
SET
  "name" = CASE
    WHEN "normalizedName" IN (
      'inderscience',
      'inderscience enterprises ltd',
      'inderscience publishers'
    ) THEN 'Inderscience'
    WHEN "normalizedName" IN (
      'emerald',
      'emerald group publishing ltd',
      'emerald group publishing ltd.'
    ) THEN 'Emerald'
    WHEN "normalizedName" IN ('springer nature', 'spring nature')
      THEN 'Springer Nature'
    ELSE "name"
  END,
  "normalizedName" = CASE
    WHEN "normalizedName" IN (
      'inderscience',
      'inderscience enterprises ltd',
      'inderscience publishers'
    ) THEN 'inderscience'
    WHEN "normalizedName" IN (
      'emerald',
      'emerald group publishing ltd',
      'emerald group publishing ltd.'
    ) THEN 'emerald'
    WHEN "normalizedName" IN ('springer nature', 'spring nature')
      THEN 'springer nature'
    ELSE "normalizedName"
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "normalizedName" IN (
  'inderscience',
  'inderscience enterprises ltd',
  'inderscience publishers',
  'emerald',
  'emerald group publishing ltd',
  'emerald group publishing ltd.',
  'springer nature',
  'spring nature'
);

UPDATE "Journal" AS journal
SET "publisher" = publisher."name"
FROM "Publisher" AS publisher
WHERE journal."publisherId" = publisher."id"
  AND publisher."normalizedName" IN (
    'inderscience',
    'emerald',
    'springer nature'
  );

DROP TABLE IF EXISTS "merged_publisher_account_map";
CREATE TEMP TABLE "merged_publisher_account_map" (
  "duplicateId" TEXT PRIMARY KEY,
  "survivorId" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL
);

INSERT INTO "merged_publisher_account_map" (
  "duplicateId",
  "survivorId",
  "publisherId"
)
WITH ranked_accounts AS (
  SELECT
    account."id",
    account."publisherId",
    FIRST_VALUE(account."id") OVER (
      PARTITION BY
        account."publisherId",
        LOWER(BTRIM(account."username")),
        account."password"
      ORDER BY
        CASE WHEN account."accountType" = 'PUBLISHER' THEN 0 ELSE 1 END,
        account."createdAt",
        account."id"
    ) AS "survivorId",
    COUNT(*) OVER (
      PARTITION BY
        account."publisherId",
        LOWER(BTRIM(account."username")),
        account."password"
    ) AS "duplicateCount"
  FROM "PublisherAccount" AS account
  JOIN "Publisher" AS publisher ON publisher."id" = account."publisherId"
  WHERE publisher."normalizedName" IN (
    'inderscience',
    'emerald',
    'springer nature'
  )
)
SELECT "id", "survivorId", "publisherId"
FROM ranked_accounts
WHERE "duplicateCount" > 1
  AND "id" <> "survivorId";

UPDATE "ResearchSubmission" AS submission
SET "accountId" = merge_map."survivorId"
FROM "merged_publisher_account_map" AS merge_map
WHERE submission."accountId" = merge_map."duplicateId";

UPDATE "AcademicReview" AS review
SET "accountId" = merge_map."survivorId"
FROM "merged_publisher_account_map" AS merge_map
WHERE review."accountId" = merge_map."duplicateId";

UPDATE "ResearchTask" AS task
SET "accountId" = merge_map."survivorId"
FROM "merged_publisher_account_map" AS merge_map
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
  FROM "merged_publisher_account_map" AS merge_map
  JOIN "PublisherAccount" AS duplicate
    ON duplicate."id" = merge_map."duplicateId"
  GROUP BY merge_map."survivorId", merge_map."publisherId"
) AS survivor
WHERE account."id" = survivor."survivorId";

UPDATE "Publisher" AS publisher
SET "usesSingleAccount" = TRUE
FROM (
  SELECT DISTINCT "publisherId"
  FROM "merged_publisher_account_map"
) AS merged_accounts
WHERE publisher."id" = merged_accounts."publisherId";

DELETE FROM "PublisherAccount" AS account
USING "merged_publisher_account_map" AS merge_map
WHERE account."id" = merge_map."duplicateId";
