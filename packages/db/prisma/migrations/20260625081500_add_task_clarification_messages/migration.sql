CREATE TABLE "ResearchTaskClarificationMessage" (
  "id" TEXT NOT NULL,
  "clarificationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResearchTaskClarificationMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResearchTaskClarificationMessage"
ADD CONSTRAINT "ResearchTaskClarificationMessage_clarificationId_fkey"
FOREIGN KEY ("clarificationId") REFERENCES "ResearchTaskClarification"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchTaskClarificationMessage"
ADD CONSTRAINT "ResearchTaskClarificationMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ResearchTaskClarificationMessage_clarificationId_createdAt_idx"
ON "ResearchTaskClarificationMessage"("clarificationId", "createdAt");

CREATE INDEX "ResearchTaskClarificationMessage_senderId_idx"
ON "ResearchTaskClarificationMessage"("senderId");
