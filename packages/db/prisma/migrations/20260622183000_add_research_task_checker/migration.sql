-- Add an optional chief-assistant checker for admin-created research tasks.
ALTER TABLE "ResearchTask" ADD COLUMN "checkerId" TEXT;

ALTER TABLE "ResearchTask"
ADD CONSTRAINT "ResearchTask_checkerId_fkey"
FOREIGN KEY ("checkerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ResearchTask_checkerId_idx" ON "ResearchTask"("checkerId");
