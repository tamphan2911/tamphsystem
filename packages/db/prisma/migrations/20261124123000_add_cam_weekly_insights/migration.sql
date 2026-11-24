CREATE TABLE IF NOT EXISTS "cam_care_weekly_insight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "suggestion" TEXT,
    "model" TEXT,
    "source" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cam_care_weekly_insight_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cam_care_weekly_insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cam_care_user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cam_care_weekly_insight_userId_weekNumber_key" ON "cam_care_weekly_insight"("userId", "weekNumber");
CREATE INDEX IF NOT EXISTS "cam_care_weekly_insight_userId_windowEnd_idx" ON "cam_care_weekly_insight"("userId", "windowEnd");
