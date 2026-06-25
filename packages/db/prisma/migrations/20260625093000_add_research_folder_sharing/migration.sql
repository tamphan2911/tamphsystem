ALTER TABLE "ResearchProjectAuthor"
ADD COLUMN "folderShared" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "_ResearchFolderSharedUsers" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_ResearchFolderSharedUsers_AB_unique"
ON "_ResearchFolderSharedUsers"("A", "B");

CREATE INDEX "_ResearchFolderSharedUsers_B_index"
ON "_ResearchFolderSharedUsers"("B");

ALTER TABLE "_ResearchFolderSharedUsers"
ADD CONSTRAINT "_ResearchFolderSharedUsers_A_fkey"
FOREIGN KEY ("A")
REFERENCES "ResearchProject"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "_ResearchFolderSharedUsers"
ADD CONSTRAINT "_ResearchFolderSharedUsers_B_fkey"
FOREIGN KEY ("B")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
