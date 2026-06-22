UPDATE "PublisherAccount" AS account
SET
  "accountType" = 'JOURNAL',
  "journalId" = journal."id",
  "publisherId" = journal."publisherId",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Journal" AS journal
WHERE journal."id" = '7642e651-4302-426b-9009-d7f3c1936516'
  AND LOWER(BTRIM(account."username")) = 'tamphan2911'
  AND (
    account."journalId" = journal."id"
    OR EXISTS (
      SELECT 1
      FROM "ResearchSubmission" AS submission
      WHERE submission."accountId" = account."id"
        AND submission."journalId" = journal."id"
    )
  );

UPDATE "Publisher" AS publisher
SET
  "usesSingleAccount" = FALSE,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Journal" AS journal
WHERE journal."id" = '7642e651-4302-426b-9009-d7f3c1936516'
  AND publisher."id" = journal."publisherId";
