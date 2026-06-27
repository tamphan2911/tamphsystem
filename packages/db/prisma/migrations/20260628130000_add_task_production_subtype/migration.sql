CREATE TYPE "ResearchProductionSubtype" AS ENUM (
  'IDEA_FORMING',
  'DATA_COLLECTION',
  'MODELING',
  'WRITING',
  'HUMANIZING',
  'REFERENCES'
);

ALTER TABLE "ResearchTask"
ADD COLUMN "productionSubtype" "ResearchProductionSubtype";
