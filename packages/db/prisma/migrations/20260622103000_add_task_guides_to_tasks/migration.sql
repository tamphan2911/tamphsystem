CREATE TABLE "_ResearchTaskGuides" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_ResearchTaskGuides_AB_unique" ON "_ResearchTaskGuides"("A", "B");
CREATE INDEX "_ResearchTaskGuides_B_index" ON "_ResearchTaskGuides"("B");

ALTER TABLE "_ResearchTaskGuides"
  ADD CONSTRAINT "_ResearchTaskGuides_A_fkey"
  FOREIGN KEY ("A")
  REFERENCES "ResearchTask"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "_ResearchTaskGuides"
  ADD CONSTRAINT "_ResearchTaskGuides_B_fkey"
  FOREIGN KEY ("B")
  REFERENCES "TaskGuide"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
