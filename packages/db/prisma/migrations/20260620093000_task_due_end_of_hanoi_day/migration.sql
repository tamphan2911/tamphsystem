UPDATE "ResearchTask"
SET "dueDate" = date_trunc('day', "dueDate")
  + interval '16 hours 59 minutes 59.999 seconds'
WHERE "dueDate" IS NOT NULL
  AND "dueDate" = date_trunc('day', "dueDate");
