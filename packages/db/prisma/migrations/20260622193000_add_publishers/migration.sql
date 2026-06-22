CREATE TABLE IF NOT EXISTS "Publisher" (
  "id" TEXT NOT NULL,
  "publisherCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "alias" TEXT,
  "country" TEXT,
  "website" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Publisher_publisherCode_key" ON "Publisher"("publisherCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Publisher_normalizedName_key" ON "Publisher"("normalizedName");

ALTER TABLE "Journal" ADD COLUMN IF NOT EXISTS "publisherId" TEXT;

WITH publisher_names AS (
  SELECT
    MIN(BTRIM("publisher")) AS "name",
    LOWER(REGEXP_REPLACE(BTRIM("publisher"), '\s+', ' ', 'g')) AS "normalizedName"
  FROM "Journal"
  WHERE "publisher" IS NOT NULL AND BTRIM("publisher") <> ''
  GROUP BY LOWER(REGEXP_REPLACE(BTRIM("publisher"), '\s+', ' ', 'g'))
), numbered_publishers AS (
  SELECT
    "name",
    "normalizedName",
    ROW_NUMBER() OVER (ORDER BY "normalizedName") AS row_number
  FROM publisher_names
)
INSERT INTO "Publisher" (
  "id",
  "publisherCode",
  "name",
  "normalizedName",
  "createdAt",
  "updatedAt"
)
SELECT
  MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT)::UUID::TEXT,
  'PUB-' || LPAD(row_number::TEXT, 4, '0'),
  "name",
  "normalizedName",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM numbered_publishers
ON CONFLICT DO NOTHING;

UPDATE "Journal" AS journal
SET "publisherId" = publisher."id",
    "publisher" = publisher."name"
FROM "Publisher" AS publisher
WHERE journal."publisher" IS NOT NULL
  AND LOWER(REGEXP_REPLACE(BTRIM(journal."publisher"), '\s+', ' ', 'g')) = publisher."normalizedName";

CREATE INDEX IF NOT EXISTS "Journal_publisherId_idx" ON "Journal"("publisherId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Journal_publisherId_fkey'
  ) THEN
    ALTER TABLE "Journal"
    ADD CONSTRAINT "Journal_publisherId_fkey"
    FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
