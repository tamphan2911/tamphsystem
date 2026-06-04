-- Add session-linked quizzes and per-user session completions for the LMS.
ALTER TABLE "Quiz" ADD COLUMN "sessionId" TEXT;

CREATE TABLE "SessionCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quiz_sessionId_key" ON "Quiz"("sessionId");
CREATE UNIQUE INDEX "SessionCompletion_userId_sessionId_key" ON "SessionCompletion"("userId", "sessionId");
CREATE INDEX "SessionCompletion_userId_courseId_idx" ON "SessionCompletion"("userId", "courseId");

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionCompletion" ADD CONSTRAINT "SessionCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionCompletion" ADD CONSTRAINT "SessionCompletion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionCompletion" ADD CONSTRAINT "SessionCompletion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
